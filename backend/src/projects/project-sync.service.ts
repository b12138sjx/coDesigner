import { Inject, Injectable, Logger, OnModuleDestroy, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import type { IncomingMessage } from 'http'
import type { Socket } from 'net'
import { TLStoreSnapshot, createTLSchema } from '@tldraw/tlschema'
import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { WebSocketServer } from 'ws'
import { AccessTokenPayload } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { ProjectsService } from './projects.service'

const SYNC_ROOM_SNAPSHOT_SCHEMA_VERSION = 2
const CLEANUP_DELAY_MS = 30 * 1000
const PERSIST_DEBOUNCE_MS = 400
const SYNC_PATH_PREFIX = '/api/v1/sync/projects/'

type SyncSessionMeta = {
  projectId: string
  projectKey: string
  userId: string
  username: string
}

type RoomState = {
  room: TLSocketRoom<any, SyncSessionMeta>
  projectId: string
  projectKey: string
  saveInFlight: boolean
  savePending: boolean
  saveTimer: NodeJS.Timeout | null
  cleanupTimer: NodeJS.Timeout | null
}

@Injectable()
export class ProjectSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(ProjectSyncService.name)
  private readonly schema = createTLSchema()
  private readonly wsServer = new WebSocketServer({ noServer: true })
  private readonly rooms = new Map<string, RoomState>()
  private readonly roomPromises = new Map<string, Promise<RoomState>>()
  private attachedServer = false

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  attach(server: {
    on: (event: 'upgrade', listener: (req: IncomingMessage, socket: Socket, head: Buffer) => void) => void
  }) {
    if (this.attachedServer) return

    server.on('upgrade', (req, socket, head) => {
      void this.handleUpgrade(req, socket, head)
    })

    this.attachedServer = true
  }

  async onModuleDestroy() {
    this.wsServer.close()
    for (const roomState of this.rooms.values()) {
      this.disposeRoom(roomState)
    }
    this.rooms.clear()
    this.roomPromises.clear()
  }

  private async handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    const requestUrl = this.parseRequestUrl(req)
    if (!requestUrl || !requestUrl.pathname.startsWith(SYNC_PATH_PREFIX)) {
      return
    }

    const projectKey = decodeURIComponent(requestUrl.pathname.slice(SYNC_PATH_PREFIX.length))
    const accessToken = requestUrl.searchParams.get('accessToken') || ''
    const sessionId = requestUrl.searchParams.get('sessionId') || randomUUID()

    if (!accessToken) {
      this.rejectUpgrade(socket, 401, 'Missing access token')
      return
    }

    let payload: AccessTokenPayload
    try {
      payload = await this.verifyAccessToken(accessToken)
    } catch (error) {
      const message = error instanceof UnauthorizedException ? error.message : 'Invalid access token'
      this.rejectUpgrade(socket, 401, message)
      return
    }

    try {
      const access = await this.projectsService.getRealtimeProjectAccess(payload.sub, projectKey)
      const roomState = await this.getOrCreateRoom(access.projectId, access.projectKey)

      if (roomState.cleanupTimer) {
        clearTimeout(roomState.cleanupTimer)
        roomState.cleanupTimer = null
      }

      this.wsServer.handleUpgrade(req, socket, head, (ws) => {
        roomState.room.handleSocketConnect({
          sessionId,
          socket: ws,
          meta: {
            projectId: access.projectId,
            projectKey: access.projectKey,
            userId: payload.sub,
            username: payload.username,
          },
        })
      })
    } catch (error) {
      const status = this.resolveUpgradeStatus(error)
      const message = error instanceof Error ? error.message : 'Failed to join room'
      this.rejectUpgrade(socket, status, message)
    }
  }

  private async getOrCreateRoom(projectId: string, projectKey: string) {
    const existing = this.rooms.get(projectId)
    if (existing && !existing.room.isClosed()) {
      return existing
    }

    const pending = this.roomPromises.get(projectId)
    if (pending) {
      return pending
    }

    const roomPromise = this.createRoom(projectId, projectKey)
    this.roomPromises.set(projectId, roomPromise)

    try {
      const roomState = await roomPromise
      this.rooms.set(projectId, roomState)
      return roomState
    } finally {
      this.roomPromises.delete(projectId)
    }
  }

  private async createRoom(projectId: string, projectKey: string): Promise<RoomState> {
    const initialSnapshot = await this.loadInitialSnapshot(projectId)

    const roomState: RoomState = {
      projectId,
      projectKey,
      saveInFlight: false,
      savePending: false,
      saveTimer: null,
      cleanupTimer: null,
      room: new TLSocketRoom<any, SyncSessionMeta>({
        schema: this.schema,
        initialSnapshot: initialSnapshot || undefined,
        onDataChange: () => {
          this.schedulePersist(roomState)
        },
        onSessionRemoved: (_room, args) => {
          if (args.numSessionsRemaining === 0) {
            this.scheduleRoomCleanup(roomState)
          }
        },
        log: {
          warn: (...args) => this.logger.warn(args),
          error: (...args) => this.logger.error(args),
        },
      }),
    }

    return roomState
  }

  private async loadInitialSnapshot(projectId: string): Promise<RoomSnapshot | TLStoreSnapshot | null> {
    const canvas = await this.prisma.projectCanvas.findUnique({
      where: { projectId },
      select: {
        snapshot: true,
        snapshotSchemaVersion: true,
      },
    })

    if (!canvas?.snapshot) return null

    return this.normalizePersistedSnapshot(
      canvas.snapshot as Record<string, unknown>,
      canvas.snapshotSchemaVersion
    )
  }

  private normalizePersistedSnapshot(
    snapshot: Record<string, unknown>,
    snapshotSchemaVersion: number | null
  ): RoomSnapshot | TLStoreSnapshot | null {
    if (snapshotSchemaVersion === SYNC_ROOM_SNAPSHOT_SCHEMA_VERSION && this.isRoomSnapshot(snapshot)) {
      return snapshot
    }

    if (this.isLegacyEditorSnapshot(snapshot)) {
      return snapshot.document
    }

    if (this.isRoomSnapshot(snapshot)) {
      return snapshot
    }

    return snapshot as unknown as TLStoreSnapshot
  }

  private isLegacyEditorSnapshot(snapshot: Record<string, unknown>): snapshot is { document: TLStoreSnapshot } {
    return Boolean(snapshot && typeof snapshot === 'object' && snapshot.document)
  }

  private isRoomSnapshot(snapshot: unknown): snapshot is RoomSnapshot {
    if (!snapshot || typeof snapshot !== 'object') return false

    const maybeSnapshot = snapshot as { clock?: unknown; documents?: unknown }
    return typeof maybeSnapshot.clock === 'number' && Array.isArray(maybeSnapshot.documents)
  }

  private schedulePersist(roomState: RoomState) {
    if (roomState.room.isClosed()) return

    if (roomState.saveTimer) {
      clearTimeout(roomState.saveTimer)
    }

    roomState.saveTimer = setTimeout(() => {
      roomState.saveTimer = null
      void this.persistRoom(roomState)
    }, PERSIST_DEBOUNCE_MS)
  }

  private scheduleRoomCleanup(roomState: RoomState) {
    if (roomState.cleanupTimer) {
      clearTimeout(roomState.cleanupTimer)
    }

    roomState.cleanupTimer = setTimeout(() => {
      roomState.cleanupTimer = null
      void this.persistRoom(roomState).finally(() => {
        if (roomState.room.getNumActiveSessions() === 0) {
          this.disposeRoom(roomState)
          this.rooms.delete(roomState.projectId)
        }
      })
    }, CLEANUP_DELAY_MS)
  }

  private async persistRoom(roomState: RoomState) {
    if (roomState.room.isClosed()) return

    if (roomState.saveInFlight) {
      roomState.savePending = true
      return
    }

    roomState.saveInFlight = true

    try {
      const snapshot = roomState.room.getCurrentSnapshot()
      const now = new Date()

      await this.prisma.$transaction(async (tx) => {
        await tx.projectCanvas.upsert({
          where: { projectId: roomState.projectId },
          create: {
            projectId: roomState.projectId,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            snapshotSchemaVersion: SYNC_ROOM_SNAPSHOT_SCHEMA_VERSION,
            revision: 1,
            createdAt: now,
            updatedAt: now,
          },
          update: {
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            snapshotSchemaVersion: SYNC_ROOM_SNAPSHOT_SCHEMA_VERSION,
            revision: {
              increment: 1,
            },
            updatedAt: now,
          },
        })

        await tx.project.update({
          where: { id: roomState.projectId },
          data: {
            updatedAt: now,
          },
        })
      })
    } catch (error) {
      this.logger.error(`Failed to persist room ${roomState.projectKey}`, error)
    } finally {
      roomState.saveInFlight = false
      if (roomState.savePending) {
        roomState.savePending = false
        void this.persistRoom(roomState)
      }
    }
  }

  private disposeRoom(roomState: RoomState) {
    if (roomState.saveTimer) {
      clearTimeout(roomState.saveTimer)
      roomState.saveTimer = null
    }

    if (roomState.cleanupTimer) {
      clearTimeout(roomState.cleanupTimer)
      roomState.cleanupTimer = null
    }

    if (!roomState.room.isClosed()) {
      roomState.room.close()
    }
  }

  private parseRequestUrl(req: IncomingMessage) {
    if (!req.url) return null

    try {
      return new URL(req.url, 'http://localhost')
    } catch {
      return null
    }
  }

  private async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
    })

    if (!payload?.sub || payload.type !== 'access') {
      throw new UnauthorizedException('访问令牌格式无效')
    }

    return payload
  }

  private resolveUpgradeStatus(error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'getStatus' in error &&
      typeof error.getStatus === 'function'
    ) {
      return error.getStatus()
    }

    return 500
  }

  private rejectUpgrade(socket: Socket, status: number, message: string) {
    const statusText =
      status === 401
        ? 'Unauthorized'
        : status === 403
          ? 'Forbidden'
          : status === 404
            ? 'Not Found'
            : 'Internal Server Error'

    socket.write(
      `HTTP/1.1 ${status} ${statusText}\r\n` +
        'Connection: close\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        `Content-Length: ${Buffer.byteLength(message)}\r\n` +
        '\r\n' +
        message
    )
    socket.destroy()
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key)
    if (!value) {
      throw new UnauthorizedException(`缺少环境变量: ${key}`)
    }
    return value
  }
}

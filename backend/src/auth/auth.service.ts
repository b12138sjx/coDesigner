import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { createHmac, randomUUID } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Prisma, User, UserStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDto } from './dto/register.dto'

export interface ClientMeta {
  userAgent: string | null
  ipAddress: string | null
}

interface RefreshTokenPayload {
  sub: string
  sid: string
  rid?: string
  type: 'refresh'
  iat?: number
  exp?: number
}

interface AccessTokenPayload {
  sub: string
  username: string
  type: 'access'
  iat?: number
  exp?: number
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto, clientMeta: ClientMeta) {
    const username = dto.username.trim()
    const usernameNormalized = this.normalizeUsername(dto.username)
    const displayName = dto.displayName?.trim() || username

    const existingUser = await this.prisma.user.findUnique({
      where: { usernameNormalized },
    })

    if (existingUser && !existingUser.deletedAt) {
      throw new BadRequestException('账号已存在，请直接登录')
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds)

    let user: User
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            username,
            usernameNormalized,
            displayName,
          },
        })

        await tx.userCredential.create({
          data: {
            userId: createdUser.id,
            passwordHash,
          },
        })

        return createdUser
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException('账号已存在，请直接登录')
      }
      throw error
    }

    const tokens = await this.createSessionAndIssueTokens(user, clientMeta)

    return {
      user: this.toUserProfile(user),
      ...tokens,
    }
  }

  async login(dto: LoginDto, clientMeta: ClientMeta) {
    const usernameNormalized = this.normalizeUsername(dto.username)

    const user = await this.prisma.user.findUnique({
      where: { usernameNormalized },
      include: { credential: true },
    })

    if (!user || user.deletedAt || user.status !== UserStatus.active || !user.credential) {
      throw new UnauthorizedException('账号或密码错误')
    }

    const passwordMatched = await bcrypt.compare(dto.password, user.credential.passwordHash)
    if (!passwordMatched) {
      throw new UnauthorizedException('账号或密码错误')
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = await this.createSessionAndIssueTokens(updatedUser, clientMeta)

    return {
      user: this.toUserProfile(updatedUser),
      ...tokens,
    }
  }

  async refresh(dto: RefreshTokenDto, clientMeta: ClientMeta) {
    const refreshPayload = await this.verifyRefreshToken(dto.refreshToken)

    const session = await this.prisma.userSession.findUnique({
      where: { id: refreshPayload.sid },
    })

    if (
      !session ||
      session.userId !== refreshPayload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('登录已失效，请重新登录')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: refreshPayload.sub },
    })

    if (!user || user.deletedAt || user.status !== UserStatus.active) {
      throw new UnauthorizedException('用户状态异常，请重新登录')
    }

    const currentRefreshTokenHash = this.hashRefreshToken(dto.refreshToken)
    const accessToken = await this.signAccessToken(user)
    const refreshToken = await this.signRefreshToken(user, session.id)
    const nextRefreshTokenHash = this.hashRefreshToken(refreshToken)
    const refreshTokenExpiresAt = this.getTokenExpiresAtIso(refreshToken)

    const rotateResult = await this.prisma.userSession.updateMany({
      where: {
        id: session.id,
        userId: refreshPayload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        refreshTokenHash: currentRefreshTokenHash,
      },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt: new Date(refreshTokenExpiresAt),
        userAgent: clientMeta.userAgent || session.userAgent,
        ipAddress: clientMeta.ipAddress || session.ipAddress,
      },
    })

    if (rotateResult.count !== 1) {
      throw new UnauthorizedException('刷新令牌已失效，请重新登录')
    }

    return {
      user: this.toUserProfile(user),
      tokenType: 'Bearer',
      accessToken,
      accessTokenExpiresAt: this.getTokenExpiresAtIso(accessToken),
      refreshToken,
      refreshTokenExpiresAt,
    }
  }

  private async createSessionAndIssueTokens(user: User, clientMeta: ClientMeta) {
    const placeholderExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        userAgent: clientMeta.userAgent,
        ipAddress: clientMeta.ipAddress,
        expiresAt: placeholderExpiresAt,
      },
    })

    const accessToken = await this.signAccessToken(user)
    const refreshToken = await this.signRefreshToken(user, session.id)
    const refreshTokenExpiresAt = this.getTokenExpiresAtIso(refreshToken)

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(refreshTokenExpiresAt),
      },
    })

    return {
      tokenType: 'Bearer',
      accessToken,
      accessTokenExpiresAt: this.getTokenExpiresAtIso(accessToken),
      refreshToken,
      refreshTokenExpiresAt,
    }
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase()
  }

  private toUserProfile(user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      type: 'access',
    }

    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
    })
  }

  private async signRefreshToken(user: User, sessionId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      rid: randomUUID(),
      type: 'refresh',
    }

    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    })
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      })

      if (!payload?.sub || !payload?.sid || payload.type !== 'refresh') {
        throw new UnauthorizedException('刷新令牌格式无效')
      }

      return payload
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期')
    }
  }

  private getTokenExpiresAtIso(token: string): string {
    const payload = this.jwtService.decode(token)

    if (typeof payload !== 'object' || payload === null || typeof payload.exp !== 'number') {
      throw new InternalServerErrorException('无法解析令牌过期时间')
    }

    return new Date(payload.exp * 1000).toISOString()
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key)
    if (!value) {
      throw new InternalServerErrorException(`缺少环境变量: ${key}`)
    }
    return value
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
  }

  private hashRefreshToken(token: string): string {
    return createHmac('sha256', this.getRequiredEnv('JWT_REFRESH_SECRET'))
      .update(token)
      .digest('hex')
  }
}

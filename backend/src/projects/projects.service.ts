import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, Project, ProjectCanvas, User, UserStatus } from '@prisma/client'
import { randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { AddProjectMemberDto } from './dto/add-project-member.dto'
import { CreateProjectDto } from './dto/create-project.dto'
import {
  ImportLocalProjectItemDto,
  ImportLocalProjectsDto,
} from './dto/import-local-projects.dto'
import { PutProjectCanvasDto } from './dto/put-project-canvas.dto'
import { UpdateProjectDto } from './dto/update-project.dto'

type ProjectWithCanvas = Prisma.ProjectGetPayload<{ include: { canvas: true } }>
type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: { owner: true; members: { include: { user: true } } }
}>
type ProjectAccessRole = 'owner' | 'editor'

@Injectable()
export class ProjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerUserId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    })

    return {
      projects: projects.map((project) => this.serializeProject(project, userId)),
    }
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const name = dto.name.trim()
    const brief = dto.brief?.trim() || ''
    const projectKey = dto.projectKey?.trim() || (await this.generateProjectKey(userId))

    try {
      const project = await this.prisma.project.create({
        data: {
          ownerUserId: userId,
          projectKey,
          name,
          brief,
        },
      })

      return { project: this.serializeProject(project, userId) }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException('Project key already exists.')
      }
      throw error
    }
  }

  async getProject(userId: string, projectKey: string) {
    const access = await this.getProjectAccessWithMembers(userId, projectKey)

    return {
      project: this.serializeProjectDetail(access.project, access.accessRole),
    }
  }

  async updateProject(userId: string, projectKey: string, dto: UpdateProjectDto) {
    const access = await this.getProjectAccess(userId, projectKey, true)
    const project = access.project

    const data: Prisma.ProjectUpdateInput = {}
    if (dto.name !== undefined) {
      data.name = dto.name.trim()
    }
    if (dto.brief !== undefined) {
      data.brief = dto.brief.trim()
    }

    if (Object.keys(data).length === 0) {
      return { project: this.serializeProject(project, userId) }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: project.id },
      data,
    })

    return { project: this.serializeProject(updatedProject, userId) }
  }

  async deleteProject(userId: string, projectKey: string) {
    const access = await this.getProjectAccess(userId, projectKey, true)
    const project = access.project
    const now = new Date()

    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        deletedAt: now,
        updatedAt: now,
      },
    })

    return { success: true }
  }

  async getProjectCanvas(userId: string, projectKey: string) {
    const access = await this.getProjectAccessWithCanvas(userId, projectKey)
    return this.serializeCanvas(access.project)
  }

  async putProjectCanvas(userId: string, projectKey: string, dto: PutProjectCanvasDto) {
    const access = await this.getProjectAccess(userId, projectKey)
    const project = access.project
    const now = new Date()
    const nextRevision = dto.baseRevision + 1

    try {
      await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.projectCanvas.updateMany({
          where: {
            projectId: project.id,
            revision: dto.baseRevision,
          },
          data: {
            snapshot: this.toInputJson(dto.snapshot),
            snapshotSchemaVersion: dto.snapshotSchemaVersion,
            revision: nextRevision,
            updatedAt: now,
          },
        })

        if (updateResult.count === 0) {
          if (dto.baseRevision !== 0) {
            const latestCanvas = await tx.projectCanvas.findUnique({
              where: { projectId: project.id },
              select: {
                revision: true,
                updatedAt: true,
              },
            })
            this.throwRevisionConflict(latestCanvas?.revision ?? 0, latestCanvas?.updatedAt ?? null)
          }

          await tx.projectCanvas.create({
            data: {
              projectId: project.id,
              snapshot: this.toInputJson(dto.snapshot),
              snapshotSchemaVersion: dto.snapshotSchemaVersion,
              revision: nextRevision,
              createdAt: now,
              updatedAt: now,
            },
          })
        }

        await tx.project.update({
          where: { id: project.id },
          data: {
            updatedAt: now,
          },
        })
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const latestCanvas = await this.prisma.projectCanvas.findUnique({
          where: { projectId: project.id },
          select: {
            revision: true,
            updatedAt: true,
          },
        })
        this.throwRevisionConflict(latestCanvas?.revision ?? 0, latestCanvas?.updatedAt ?? null)
      }

      throw error
    }

    return {
      projectId: project.projectKey,
      revision: nextRevision,
      updatedAt: now,
      snapshotSchemaVersion: dto.snapshotSchemaVersion,
    }
  }

  async addProjectMember(userId: string, projectKey: string, dto: AddProjectMemberDto) {
    const access = await this.getProjectAccess(userId, projectKey, true)
    const project = access.project
    const usernameNormalized = this.normalizeUsername(dto.username)

    const user = await this.prisma.user.findUnique({
      where: { usernameNormalized },
    })

    if (!user || user.deletedAt || user.status !== UserStatus.active) {
      throw new BadRequestException('用户不存在或不可用。')
    }

    if (user.id === project.ownerUserId) {
      throw new BadRequestException('项目拥有者已默认拥有访问权限。')
    }

    const now = new Date()

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: user.id,
            createdAt: now,
          },
        })

        await tx.project.update({
          where: { id: project.id },
          data: {
            updatedAt: now,
          },
        })
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException('该用户已经是项目协作者。')
      }

      throw error
    }

    return {
      member: this.serializeMember(user, false),
    }
  }

  async removeProjectMember(userId: string, projectKey: string, memberUserId: string) {
    const access = await this.getProjectAccess(userId, projectKey, true)
    const project = access.project

    if (memberUserId === project.ownerUserId) {
      throw new BadRequestException('项目拥有者不能被移除。')
    }

    const now = new Date()
    const result = await this.prisma.$transaction(async (tx) => {
      const deleteResult = await tx.projectMember.deleteMany({
        where: {
          projectId: project.id,
          userId: memberUserId,
        },
      })

      if (deleteResult.count === 0) {
        return deleteResult
      }

      await tx.project.update({
        where: { id: project.id },
        data: {
          updatedAt: now,
        },
      })

      return deleteResult
    })

    if (result.count === 0) {
      throw new NotFoundException('协作者不存在。')
    }

    return { success: true }
  }

  async importLocalProjects(userId: string, dto: ImportLocalProjectsDto) {
    const dedupedProjects = this.dedupeImportProjects(dto.projects)
    if (dedupedProjects.length === 0) {
      return {
        importedProjectIds: [],
        skippedProjectIds: [],
      }
    }

    const projectKeys = dedupedProjects.map((item) => item.id)
    const existingProjects = await this.prisma.project.findMany({
      where: {
        ownerUserId: userId,
        projectKey: { in: projectKeys },
      },
      include: { canvas: true },
    })
    const existingMap = new Map(existingProjects.map((project) => [project.projectKey, project]))
    const importedProjectIds: string[] = []
    const skippedProjectIds: string[] = []

    await this.prisma.$transaction(async (tx) => {
      for (const item of dedupedProjects) {
        const existingProject = existingMap.get(item.id)

        if (!existingProject) {
          const projectTimestamp = this.parseOptionalDate(item.updatedAt) || new Date()
          const canvasTimestamp = this.parseOptionalDate(item.canvas?.updatedAt) || projectTimestamp

          await tx.project.create({
            data: {
              ownerUserId: userId,
              projectKey: item.id.trim(),
              name: item.name.trim(),
              brief: item.brief?.trim() || '',
              createdAt: projectTimestamp,
              updatedAt: projectTimestamp,
              canvas: item.canvas
                ? {
                    create: {
                      snapshot: this.toInputJson(item.canvas.snapshot),
                      snapshotSchemaVersion: item.canvas.snapshotSchemaVersion,
                      revision: 1,
                      createdAt: canvasTimestamp,
                      updatedAt: canvasTimestamp,
                    },
                  }
                : undefined,
            },
          })
          importedProjectIds.push(item.id)
          continue
        }

        if (existingProject.deletedAt) {
          skippedProjectIds.push(item.id)
          continue
        }

        if (!existingProject.canvas && item.canvas) {
          const canvasTimestamp = this.parseOptionalDate(item.canvas.updatedAt) || new Date()
          await tx.projectCanvas.create({
            data: {
              projectId: existingProject.id,
              snapshot: this.toInputJson(item.canvas.snapshot),
              snapshotSchemaVersion: item.canvas.snapshotSchemaVersion,
              revision: 1,
              createdAt: canvasTimestamp,
              updatedAt: canvasTimestamp,
            },
          })
          await tx.project.update({
            where: { id: existingProject.id },
            data: {
              updatedAt:
                this.parseOptionalDate(item.updatedAt) ||
                this.parseOptionalDate(item.canvas.updatedAt) ||
                canvasTimestamp,
            },
          })
          importedProjectIds.push(item.id)
          continue
        }

        skippedProjectIds.push(item.id)
      }
    })

    return {
      importedProjectIds,
      skippedProjectIds,
    }
  }

  async getRealtimeProjectAccess(userId: string, projectKey: string) {
    const access = await this.getProjectAccess(userId, projectKey)

    return {
      accessRole: access.accessRole,
      projectId: access.project.id,
      projectKey: access.project.projectKey,
    }
  }

  private async getProjectAccess(userId: string, projectKey: string, ownerOnly = false) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(userId, projectKey, ownerOnly),
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return {
      accessRole: this.getAccessRole(project, userId),
      project,
    }
  }

  private async getProjectAccessWithCanvas(userId: string, projectKey: string) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(userId, projectKey, false),
      include: {
        canvas: true,
      },
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return {
      accessRole: this.getAccessRole(project, userId),
      project: project as ProjectWithCanvas,
    }
  }

  private async getProjectAccessWithMembers(userId: string, projectKey: string) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(userId, projectKey, false),
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return {
      accessRole: this.getAccessRole(project, userId),
      project: project as ProjectWithMembers,
    }
  }

  private buildProjectAccessWhere(
    userId: string,
    projectKey: string,
    ownerOnly: boolean
  ): Prisma.ProjectWhereInput {
    if (ownerOnly) {
      return {
        ownerUserId: userId,
        projectKey,
        deletedAt: null,
      }
    }

    return {
      projectKey,
      deletedAt: null,
      OR: [
        { ownerUserId: userId },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    }
  }

  private getAccessRole(project: Pick<Project, 'ownerUserId'>, userId: string): ProjectAccessRole {
    return project.ownerUserId === userId ? 'owner' : 'editor'
  }

  private serializeProject(project: Project, userId: string) {
    return {
      id: project.projectKey,
      name: project.name,
      brief: project.brief,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      accessRole: this.getAccessRole(project, userId),
    }
  }

  private serializeProjectDetail(project: ProjectWithMembers, accessRole: ProjectAccessRole) {
    return {
      id: project.projectKey,
      name: project.name,
      brief: project.brief,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      accessRole,
      members: this.serializeMembers(project),
    }
  }

  private serializeMembers(project: ProjectWithMembers) {
    const members = [this.serializeMember(project.owner, true)]
    const seen = new Set<string>([project.owner.id])

    for (const membership of project.members) {
      if (seen.has(membership.user.id)) continue
      members.push(this.serializeMember(membership.user, false))
      seen.add(membership.user.id)
    }

    return members
  }

  private serializeMember(
    user: Pick<User, 'id' | 'username' | 'displayName'>,
    isOwner: boolean
  ) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isOwner,
    }
  }

  private serializeCanvas(project: ProjectWithCanvas) {
    const canvas = project.canvas as ProjectCanvas | null

    return {
      projectId: project.projectKey,
      snapshot: canvas?.snapshot ?? null,
      snapshotSchemaVersion: canvas?.snapshotSchemaVersion ?? null,
      revision: canvas?.revision ?? 0,
      updatedAt: canvas?.updatedAt ?? null,
    }
  }

  private async generateProjectKey(userId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `p_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
      const exists = await this.prisma.project.findFirst({
        where: {
          ownerUserId: userId,
          projectKey: candidate,
        },
        select: { id: true },
      })
      if (!exists) {
        return candidate
      }
    }

    throw new BadRequestException('Failed to generate a unique project key.')
  }

  private throwRevisionConflict(latestRevision: number, latestUpdatedAt: Date | null) {
    throw new HttpException(
      {
        code: 'CANVAS_REVISION_CONFLICT',
        latestRevision,
        latestUpdatedAt,
      },
      HttpStatus.CONFLICT
    )
  }

  private dedupeImportProjects(projects: ImportLocalProjectItemDto[]) {
    const projectMap = new Map<string, ImportLocalProjectItemDto>()
    for (const project of projects) {
      const key = project.id.trim()
      if (!projectMap.has(key)) {
        projectMap.set(key, project)
      }
    }
    return Array.from(projectMap.values())
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  private toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase()
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
}

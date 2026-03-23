import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, Project, ProjectCanvas } from '@prisma/client'
import { randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProjectDto } from './dto/create-project.dto'
import {
  ImportLocalProjectItemDto,
  ImportLocalProjectsDto,
} from './dto/import-local-projects.dto'
import { PutProjectCanvasDto } from './dto/put-project-canvas.dto'
import { UpdateProjectDto } from './dto/update-project.dto'

type ProjectWithCanvas = Prisma.ProjectGetPayload<{ include: { canvas: true } }>

@Injectable()
export class ProjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        ownerUserId: userId,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    })

    return {
      projects: projects.map((project) => this.serializeProject(project)),
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

      return { project: this.serializeProject(project) }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException('Project key already exists.')
      }
      throw error
    }
  }

  async getProject(userId: string, projectKey: string) {
    const project = await this.getProjectEntity(userId, projectKey)
    return { project: this.serializeProject(project) }
  }

  async updateProject(userId: string, projectKey: string, dto: UpdateProjectDto) {
    const project = await this.getProjectEntity(userId, projectKey)

    const data: Prisma.ProjectUpdateInput = {}
    if (dto.name !== undefined) {
      data.name = dto.name.trim()
    }
    if (dto.brief !== undefined) {
      data.brief = dto.brief.trim()
    }

    if (Object.keys(data).length === 0) {
      return { project: this.serializeProject(project) }
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: project.id },
      data,
    })

    return { project: this.serializeProject(updatedProject) }
  }

  async deleteProject(userId: string, projectKey: string) {
    const project = await this.getProjectEntity(userId, projectKey)
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
    const project = await this.getProjectEntity(userId, projectKey, true)
    return this.serializeCanvas(project)
  }

  async putProjectCanvas(userId: string, projectKey: string, dto: PutProjectCanvasDto) {
    const project = await this.getProjectEntity(userId, projectKey)
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

  private async getProjectEntity(
    userId: string,
    projectKey: string,
    includeCanvas = false
  ): Promise<ProjectWithCanvas> {
    const project = await this.prisma.project.findFirst({
      where: {
        ownerUserId: userId,
        projectKey,
        deletedAt: null,
      },
      include: {
        canvas: includeCanvas,
      },
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return project as ProjectWithCanvas
  }

  private serializeProject(project: Project) {
    return {
      id: project.projectKey,
      name: project.name,
      brief: project.brief,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
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

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
}

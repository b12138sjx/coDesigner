import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AccessTokenGuard } from '../auth/access-token.guard'
import { AuthenticatedRequest } from '../auth/auth.types'
import { AddProjectMemberDto } from './dto/add-project-member.dto'
import { CreateProjectDto } from './dto/create-project.dto'
import { ImportLocalProjectsDto } from './dto/import-local-projects.dto'
import { PutProjectCanvasDto } from './dto/put-project-canvas.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { ProjectsService } from './projects.service'

@UseGuards(AccessTokenGuard)
@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.projectsService.listProjects(this.getUserId(req))
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(this.getUserId(req), dto)
  }

  @Post('import-local')
  importLocal(@Req() req: AuthenticatedRequest, @Body() dto: ImportLocalProjectsDto) {
    return this.projectsService.importLocalProjects(this.getUserId(req), dto)
  }

  @Get(':projectId')
  detail(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.projectsService.getProject(this.getUserId(req), projectId)
  }

  @Patch(':projectId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto
  ) {
    return this.projectsService.updateProject(this.getUserId(req), projectId, dto)
  }

  @Delete(':projectId')
  remove(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(this.getUserId(req), projectId)
  }

  @Get(':projectId/canvas')
  getCanvas(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.projectsService.getProjectCanvas(this.getUserId(req), projectId)
  }

  @Put(':projectId/canvas')
  putCanvas(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: PutProjectCanvasDto
  ) {
    return this.projectsService.putProjectCanvas(this.getUserId(req), projectId, dto)
  }

  @Post(':projectId/members')
  addMember(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto
  ) {
    return this.projectsService.addProjectMember(this.getUserId(req), projectId, dto)
  }

  @Delete(':projectId/members/:memberUserId')
  removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('memberUserId') memberUserId: string
  ) {
    return this.projectsService.removeProjectMember(this.getUserId(req), projectId, memberUserId)
  }

  private getUserId(req: AuthenticatedRequest) {
    return req.authUser?.sub || ''
  }
}

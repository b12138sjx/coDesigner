import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProjectSyncService } from './project-sync.service'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectSyncService],
  exports: [ProjectSyncService],
})
export class ProjectsModule {}

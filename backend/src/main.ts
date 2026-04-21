import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ProjectSyncService } from './projects/project-sync.service'

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173'
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const syncService = app.get(ProjectSyncService)

  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
  })

  syncService.attach(app.getHttpServer())

  const port = Number(process.env.PORT || 3000)
  const host = process.env.HOST || '0.0.0.0'
  await app.listen(port, host)
}

bootstrap()

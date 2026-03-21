import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173'
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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

  const port = Number(process.env.PORT || 3000)
  await app.listen(port)
}

bootstrap()

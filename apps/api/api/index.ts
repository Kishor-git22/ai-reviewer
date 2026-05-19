import 'tsconfig-paths/register'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { ExpressAdapter } from '@nestjs/platform-express'
import * as express from 'express'

const expressApp = express()
let isInitialized = false

async function bootstrap() {
  if (isInitialized) return

  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn'] }
  )

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  nestApp.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://ai-code-reviewer-application.vercel.app',
    ],
    credentials: true,
  })

  await nestApp.init()
  isInitialized = true
}

export default async function handler(req: any, res: any) {
  await bootstrap()
  expressApp(req, res)
}

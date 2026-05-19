import { NestFactory } from '@nestjs/core'
import { ValidationPipe, INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { ExpressAdapter } from '@nestjs/platform-express'
import express from 'express'

const expressApp = express()
let isInitialized = false
let nestApp: INestApplication

async function bootstrap() {
  if (isInitialized) return

  nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp))

  const configService = nestApp.get(ConfigService)
  const port = configService.get<number>('PORT', 3001)

  // Enable validation
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Enable CORS for frontend
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

  nestApp.enableShutdownHooks()
  await nestApp.init()
  isInitialized = true

  // Start listening only when running locally
  if (process.env.NODE_ENV !== 'production') {
    await nestApp.listen(port)
    console.log(`🚀 AI Reviewer API is running on: http://localhost:${port}`)
  }
}

// Local dev: start server immediately
if (process.env.NODE_ENV !== 'production') {
  bootstrap()
}

// Vercel serverless: lazy-init on first request then pass through
module.exports = async (req: any, res: any) => {
  await bootstrap()
  expressApp(req, res)
}

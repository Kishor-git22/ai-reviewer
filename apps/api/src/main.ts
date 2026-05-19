import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { ExpressAdapter } from '@nestjs/platform-express'
import * as express from 'express'

const server = express()

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server))

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 3001)

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://ai-code-reviewer-application.vercel.app',
    ],
    credentials: true,
  })

  // Enable clean shutdown on process signals
  app.enableShutdownHooks()

  await app.init()

  // Start listening only when running locally (not in serverless)
  if (process.env.NODE_ENV !== 'production') {
    await app.listen(port)
    console.log(`🚀 AI Reviewer API is running on: http://localhost:${port}`)
  }
}

bootstrap()

// Export for Vercel serverless
export default server

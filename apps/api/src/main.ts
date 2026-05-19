import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
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
  app.enableShutdownHooks();

  await app.listen(port)
  console.log(`🚀 AI Reviewer API is running on: http://localhost:${port}`)
}
bootstrap()

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

  // Configure dynamic CORS origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://ai-code-reviewer-application.vercel.app',
  ]

  nestApp.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      const isAllowed = allowedOrigins.includes(origin) || 
                        origin.endsWith('.vercel.app') ||
                        /^http:\/\/localhost:\d+$/.test(origin)
      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })

  await nestApp.init()
  isInitialized = true
}

export default async function handler(req: any, res: any) {
  // Fast CORS preflight handling to avoid cold start boot time on OPTIONS requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Requested-With, sentry-trace, baggage'
    )
    
    if (origin) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'https://ai-code-reviewer-application.vercel.app',
      ]
      const isAllowed = allowedOrigins.includes(origin) || 
                        origin.endsWith('.vercel.app') ||
                        /^http:\/\/localhost:\d+$/.test(origin)
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin)
      }
    }
    
    res.status(204).end()
    return
  }

  await bootstrap()
  expressApp(req, res)
}

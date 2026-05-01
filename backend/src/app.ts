import Fastify, { FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { ZodError } from 'zod'
import authRoutes from './routes/auth'
import tweetRoutes from './routes/tweets'
import userRoutes from './routes/users'
import streamRoutes from './routes/stream'
import notificationRoutes from './routes/notifications'
import messageRoutes from './routes/messages'

export function buildApp(opts: FastifyServerOptions = {}) {
  const isDev = process.env.NODE_ENV === 'development'
  const isTest = process.env.NODE_ENV === 'test'

  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: isDev ? 'debug' : 'info',
          ...(isDev && {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
                messageFormat: '{msg}',
              },
            },
          }),
        },
    ...opts,
  })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }

  app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      app.log.warn({ url: request.url, errors: error.errors }, 'validation error')
      return reply.status(400).send({ error: 'Validation error', details: error.errors })
    }
    if ((error as any).code === 'P2002') {
      app.log.warn({ url: request.url }, 'unique constraint violation')
      return reply.status(409).send({ error: 'Resource already exists' })
    }
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    app.log.error({ err: error, url: request.url }, 'unhandled error')
    return reply.status(500).send({ error: 'Internal server error' })
  })

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(tweetRoutes, { prefix: '/api/tweets' })
  app.register(userRoutes, { prefix: '/api/users' })
  app.register(streamRoutes, { prefix: '/api/stream' })
  app.register(notificationRoutes, { prefix: '/api/notifications' })
  app.register(messageRoutes, { prefix: '/api/messages' })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

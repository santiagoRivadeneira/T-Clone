import Fastify, { FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { ZodError } from 'zod'
import authRoutes from './routes/auth'
import tweetRoutes from './routes/tweets'
import userRoutes from './routes/users'
import streamRoutes from './routes/stream'
import notificationRoutes from './routes/notifications'

export function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    ...opts,
  })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Validation error', details: error.errors })
    }
    // Prisma unique constraint violation
    if ((error as any).code === 'P2002') {
      return reply.status(409).send({ error: 'Resource already exists' })
    }
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    app.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(tweetRoutes, { prefix: '/api/tweets' })
  app.register(userRoutes, { prefix: '/api/users' })
  app.register(streamRoutes, { prefix: '/api/stream' })
  app.register(notificationRoutes, { prefix: '/api/notifications' })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

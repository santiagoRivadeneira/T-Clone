import supertest from 'supertest'
import { FastifyInstance } from 'fastify'
import { prisma } from '../src/lib/prisma'

export async function cleanDatabase() {
  await prisma.like.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.tweet.deleteMany()
  await prisma.user.deleteMany()
}

let userCounter = 0

export async function createTestUser(
  app: FastifyInstance,
  overrides: Partial<{
    email: string
    username: string
    displayName: string
    password: string
  }> = {}
) {
  const id = ++userCounter
  const data = {
    email: `testuser${id}@example.com`,
    username: `testuser${id}`,
    displayName: `Test User ${id}`,
    password: 'password123',
    ...overrides,
  }
  const res = await supertest(app.server).post('/api/auth/register').send(data)
  return { user: res.body.user as { id: string; username: string; email: string }, token: res.body.token as string }
}

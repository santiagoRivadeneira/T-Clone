import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(15)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
  displayName: z.string().min(1).max(50),
  password: z.string().min(8),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const data = RegisterSchema.parse(request.body)

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    })
    if (existing) {
      fastify.log.warn({ username: data.username, email: data.email }, 'register failed: already taken')
      return reply.status(409).send({ error: 'Email or username already taken' })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    })

    const token = fastify.jwt.sign(
      { sub: user.id, username: user.username },
      { expiresIn: '7d' }
    )
    fastify.log.info({ userId: user.id, username: user.username }, 'user registered')
    return reply.status(201).send({ user, token })
  })

  fastify.post('/login', async (request, reply) => {
    const data = LoginSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { email: data.email } })
    if (!user) {
      fastify.log.warn({ email: data.email }, 'login failed: user not found')
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) {
      fastify.log.warn({ email: data.email, username: user.username }, 'login failed: wrong password')
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign(
      { sub: user.id, username: user.username },
      { expiresIn: '7d' }
    )
    fastify.log.info({ userId: user.id, username: user.username }, 'user logged in')
    const { passwordHash: _, ...userWithoutPassword } = user
    return reply.send({ user: userWithoutPassword, token })
  })

  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, tweets: true } },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send({ user })
  })

  fastify.patch('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const data = UpdateProfileSchema.parse(request.body)

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    })
    return reply.send({ user })
  })
}

export default authRoutes

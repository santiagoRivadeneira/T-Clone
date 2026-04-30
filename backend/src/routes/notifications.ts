import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const ACTOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/notifications
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const query = request.query as { cursor?: string; limit?: string }
    const take = Math.min(Number(query.limit ?? 20), 50)

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        actor: { select: ACTOR_SELECT },
        tweet: { select: { id: true, content: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    })

    const hasMore = notifications.length > take
    const data = hasMore ? notifications.slice(0, take) : notifications

    return reply.send({
      notifications: data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      unreadCount,
    })
  })

  // GET /api/notifications/unread-count
  fastify.get('/unread-count', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const count = await prisma.notification.count({ where: { userId, read: false } })
    return reply.send({ count })
  })

  // PATCH /api/notifications/read  — mark all as read
  fastify.patch('/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
    return reply.send({ ok: true })
  })
}

export default notificationRoutes

import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { publish } from '../lib/pubsub'

const SendMessageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
})

const AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/messages — list conversations (last message per partner)
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      include: {
        sender: { select: AUTHOR_SELECT },
        recipient: { select: AUTHOR_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    type ConvUser = { id: string; username: string; displayName: string; avatarUrl: string | null }

    // Group by conversation partner, keep latest message per partner
    const seen = new Map<string, {
      user: ConvUser
      lastMessage: (typeof messages)[number]
      unreadCount: number
    }>()

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId
      const partner = msg.senderId === userId ? msg.recipient : msg.sender

      if (!seen.has(partnerId)) {
        seen.set(partnerId, { user: partner, lastMessage: msg, unreadCount: 0 })
      }
      if (!msg.read && msg.recipientId === userId) {
        seen.get(partnerId)!.unreadCount++
      }
    }

    return reply.send({ conversations: Array.from(seen.values()) })
  })

  // GET /api/messages/unread-count
  fastify.get('/unread-count', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const count = await prisma.message.count({
      where: { recipientId: userId, read: false },
    })
    return reply.send({ count })
  })

  // GET /api/messages/:username — conversation with a specific user
  fastify.get('/:username', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { username } = request.params as { username: string }
    const query = request.query as { cursor?: string; limit?: string }
    const take = Math.min(Number(query.limit ?? 40), 100)

    const partner = await prisma.user.findUnique({
      where: { username },
      select: AUTHOR_SELECT,
    })
    if (!partner) return reply.status(404).send({ error: 'User not found' })

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: partner.id },
          { senderId: partner.id, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    const hasMore = messages.length > take
    const data = hasMore ? messages.slice(0, take) : messages

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: { senderId: partner.id, recipientId: userId, read: false },
      data: { read: true },
    })

    return reply.send({
      messages: data,
      partner,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    })
  })

  // POST /api/messages/:username — send a message
  fastify.post('/:username', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: senderId } = request.user
    const { username } = request.params as { username: string }
    const { content } = SendMessageSchema.parse(request.body)

    const recipient = await prisma.user.findUnique({
      where: { username },
      select: AUTHOR_SELECT,
    })
    if (!recipient) return reply.status(404).send({ error: 'User not found' })
    if (recipient.id === senderId) {
      return reply.status(400).send({ error: 'Cannot message yourself' })
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: AUTHOR_SELECT,
    })

    const message = await prisma.message.create({
      data: { senderId, recipientId: recipient.id, content },
    })

    // Notify recipient via SSE
    publish(recipient.id, 'new-message', { message, sender })

    fastify.log.info({ senderId, recipientId: recipient.id }, 'message sent')
    return reply.status(201).send({ message })
  })

  // PATCH /api/messages/:username/read — mark conversation as read
  fastify.patch('/:username/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { username } = request.params as { username: string }

    const partner = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!partner) return reply.status(404).send({ error: 'User not found' })

    await prisma.message.updateMany({
      where: { senderId: partner.id, recipientId: userId, read: false },
      data: { read: true },
    })

    return reply.status(200).send({ ok: true })
  })
}

export default messageRoutes

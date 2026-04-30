import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { createNotification } from '../lib/notify'

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
} as const

const AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/users/search?q=
  fastify.get('/search', async (request, reply) => {
    const { q } = request.query as { q?: string }
    if (!q || q.trim().length === 0) return reply.send({ users: [] })

    let currentUserId: string | undefined
    try {
      await request.jwtVerify()
      currentUserId = request.user.sub
    } catch {}

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        ...USER_SELECT,
        ...(currentUserId
          ? {
              followers: {
                where: { followerId: currentUserId },
                select: { followerId: true },
              },
            }
          : {}),
      },
      take: 20,
    })

    return reply.send({
      users: users.map((u) => {
        const { followers, ...rest } = u as any
        return {
          ...rest,
          isFollowing: Array.isArray(followers) ? followers.length > 0 : false,
        }
      }),
    })
  })

  // GET /api/users/:username
  fastify.get('/:username', async (request, reply) => {
    const { username } = request.params as { username: string }

    // Try to get current user for isFollowing flag
    let currentUserId: string | undefined
    try {
      await request.jwtVerify()
      currentUserId = request.user.sub
    } catch {}

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        ...USER_SELECT,
        createdAt: true,
        _count: { select: { followers: true, following: true, tweets: true } },
        ...(currentUserId
          ? {
              followers: {
                where: { followerId: currentUserId },
                select: { followerId: true },
              },
            }
          : {}),
      },
    })

    if (!user) return reply.status(404).send({ error: 'User not found' })

    const { followers, ...rest } = user as any
    return reply.send({
      user: {
        ...rest,
        isFollowing: Array.isArray(followers) ? followers.length > 0 : false,
      },
    })
  })

  // GET /api/users/:username/tweets
  fastify.get('/:username/tweets', async (request, reply) => {
    const { username } = request.params as { username: string }
    const query = request.query as { cursor?: string; limit?: string }
    const take = Math.min(Number(query.limit ?? 20), 50)

    let userId: string | undefined
    try {
      await request.jwtVerify()
      userId = request.user.sub
    } catch {}

    const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!owner) return reply.status(404).send({ error: 'User not found' })

    const tweets = await prisma.tweet.findMany({
      where: { authorId: owner.id, replyToId: null },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: userId ? { where: { userId }, select: { userId: true } } : false,
        retweets: userId ? { where: { userId }, select: { userId: true } } : false,
        bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
        _count: { select: { likes: true, replies: true, retweets: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    const hasMore = tweets.length > take
    const data = hasMore ? tweets.slice(0, take) : tweets

    return reply.send({
      tweets: data.map((t) => {
        const { likes, retweets, bookmarks, _count, ...rest } = t as any
        return {
          ...rest,
          liked: Array.isArray(likes) ? likes.length > 0 : false,
          retweeted: Array.isArray(retweets) ? retweets.length > 0 : false,
          bookmarked: Array.isArray(bookmarks) ? bookmarks.length > 0 : false,
          likesCount: _count?.likes ?? 0,
          repliesCount: _count?.replies ?? 0,
          retweetsCount: _count?.retweets ?? 0,
        }
      }),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    })
  })

  // GET /api/users/:username/followers
  fastify.get('/:username/followers', async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const follows = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ users: follows.map((f) => f.follower) })
  })

  // GET /api/users/:username/following
  fastify.get('/:username/following', async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ users: follows.map((f) => f.following) })
  })

  // POST /api/users/:username/follow  (idempotent)
  fastify.post('/:username/follow', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: followerId } = request.user
    const { username } = request.params as { username: string }

    const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!target) return reply.status(404).send({ error: 'User not found' })
    if (target.id === followerId) return reply.status(400).send({ error: 'Cannot follow yourself' })

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      create: { followerId, followingId: target.id },
      update: {},
    })
    createNotification({ userId: target.id, actorId: followerId, type: 'FOLLOW' })
    return reply.status(200).send({ following: true })
  })

  // DELETE /api/users/:username/follow  (idempotent)
  fastify.delete('/:username/follow', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: followerId } = request.user
    const { username } = request.params as { username: string }

    const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!target) return reply.status(404).send({ error: 'User not found' })

    await prisma.follow.deleteMany({
      where: { followerId, followingId: target.id },
    })
    return reply.status(204).send()
  })
}

export default userRoutes

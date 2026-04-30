import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { publish } from '../lib/pubsub'
import { createNotification } from '../lib/notify'

const CreateTweetSchema = z.object({
  content: z.string().min(1).max(280),
  replyToId: z.string().optional(),
  imageUrl: z.string().url().optional(),
})

const AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

function formatTweet(
  tweet: any,
  userId?: string
): Record<string, unknown> {
  const { likes, retweets, bookmarks, _count, ...rest } = tweet
  return {
    ...rest,
    liked: Array.isArray(likes) ? likes.length > 0 : false,
    retweeted: Array.isArray(retweets) ? retweets.length > 0 : false,
    bookmarked: Array.isArray(bookmarks) ? bookmarks.length > 0 : false,
    likesCount: _count?.likes ?? 0,
    repliesCount: _count?.replies ?? 0,
    retweetsCount: _count?.retweets ?? 0,
  }
}

const tweetRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tweets/timeline — tweets from followed users, cursor-paginated
  fastify.get('/timeline', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const query = request.query as { cursor?: string; limit?: string }
    const take = Math.min(Number(query.limit ?? 20), 50)

    const tweets = await prisma.tweet.findMany({
      where: {
        replyToId: null,
        author: { followers: { some: { followerId: userId } } },
      },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: { where: { userId }, select: { userId: true } },
        retweets: { where: { userId }, select: { userId: true } },
        bookmarks: { where: { userId }, select: { userId: true } },
        _count: { select: { likes: true, replies: true, retweets: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    const hasMore = tweets.length > take
    const data = hasMore ? tweets.slice(0, take) : tweets

    return reply.send({
      tweets: data.map((t) => formatTweet(t, userId)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    })
  })

  // POST /api/tweets — create a tweet
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: authorId } = request.user
    const data = CreateTweetSchema.parse(request.body)

    let parentAuthorId: string | undefined
    if (data.replyToId) {
      const parent = await prisma.tweet.findUnique({ where: { id: data.replyToId } })
      if (!parent) return reply.status(404).send({ error: 'Parent tweet not found' })
      parentAuthorId = parent.authorId
    }

    const tweet = await prisma.tweet.create({
      data: { content: data.content, authorId, replyToId: data.replyToId, imageUrl: data.imageUrl },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { likes: true, replies: true } },
      },
    })

    const tweetPayload = { ...tweet, liked: false, retweeted: false, bookmarked: false, likesCount: 0, repliesCount: 0, retweetsCount: 0, _count: undefined }

    // Notify parent author of the reply
    if (parentAuthorId) {
      createNotification({ userId: parentAuthorId, actorId: authorId, type: 'REPLY', tweetId: data.replyToId })
    }

    // Notify followers in real time (only top-level tweets appear in timeline)
    if (!data.replyToId) {
      const followers = await prisma.follow.findMany({
        where: { followingId: authorId },
        select: { followerId: true },
      })
      followers.forEach(f => publish(f.followerId, 'new-tweet', tweetPayload))
    }

    return reply.status(201).send({ tweet: tweetPayload })
  })

  // GET /api/tweets/:id — single tweet with replies
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    let userId: string | undefined
    try {
      await request.jwtVerify()
      userId = request.user.sub
    } catch {}

    const tweet = await prisma.tweet.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: userId ? { where: { userId }, select: { userId: true } } : false,
        retweets: userId ? { where: { userId }, select: { userId: true } } : false,
        bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
        replies: {
          include: {
            author: { select: AUTHOR_SELECT },
            likes: userId ? { where: { userId }, select: { userId: true } } : false,
            retweets: userId ? { where: { userId }, select: { userId: true } } : false,
            bookmarks: userId ? { where: { userId }, select: { userId: true } } : false,
            _count: { select: { likes: true, replies: true, retweets: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        _count: { select: { likes: true, replies: true, retweets: true } },
      },
    })

    if (!tweet) return reply.status(404).send({ error: 'Tweet not found' })

    return reply.send({
      tweet: {
        ...formatTweet(tweet, userId),
        replies: tweet.replies.map((r) => formatTweet(r, userId)),
      },
    })
  })

  // DELETE /api/tweets/:id
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id } = request.params as { id: string }

    const tweet = await prisma.tweet.findUnique({ where: { id } })
    if (!tweet) return reply.status(404).send({ error: 'Tweet not found' })
    if (tweet.authorId !== userId) return reply.status(403).send({ error: 'Not your tweet' })

    await prisma.tweet.delete({ where: { id } })

    // Notify followers so they remove it from their timeline
    if (!tweet.replyToId) {
      const followers = await prisma.follow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      })
      followers.forEach(f => publish(f.followerId, 'delete-tweet', { id }))
    }

    return reply.status(204).send()
  })

  // POST /api/tweets/:id/like  (idempotent)
  fastify.post('/:id/like', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id: tweetId } = request.params as { id: string }

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } })
    if (!tweet) return reply.status(404).send({ error: 'Tweet not found' })

    await prisma.like.upsert({
      where: { userId_tweetId: { userId, tweetId } },
      create: { userId, tweetId },
      update: {},
    })
    createNotification({ userId: tweet.authorId, actorId: userId, type: 'LIKE', tweetId })
    return reply.status(200).send({ liked: true })
  })

  // DELETE /api/tweets/:id/like  (idempotent)
  fastify.delete('/:id/like', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id: tweetId } = request.params as { id: string }

    await prisma.like.deleteMany({ where: { userId, tweetId } })
    return reply.status(204).send()
  })

  // POST /api/tweets/:id/retweet  (idempotent)
  fastify.post('/:id/retweet', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id: tweetId } = request.params as { id: string }

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } })
    if (!tweet) return reply.status(404).send({ error: 'Tweet not found' })

    await prisma.retweet.upsert({
      where: { userId_tweetId: { userId, tweetId } },
      create: { userId, tweetId },
      update: {},
    })
    createNotification({ userId: tweet.authorId, actorId: userId, type: 'RETWEET', tweetId })
    return reply.status(200).send({ retweeted: true })
  })

  // DELETE /api/tweets/:id/retweet  (idempotent)
  fastify.delete('/:id/retweet', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id: tweetId } = request.params as { id: string }

    await prisma.retweet.deleteMany({ where: { userId, tweetId } })
    return reply.status(204).send()
  })

  // POST /api/tweets/:id/bookmark  (idempotent)
  fastify.post('/:id/bookmark', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id: tweetId } = request.params as { id: string }

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } })
    if (!tweet) return reply.status(404).send({ error: 'Tweet not found' })

    await prisma.bookmark.upsert({
      where: { userId_tweetId: { userId, tweetId } },
      create: { userId, tweetId },
      update: {},
    })
    return reply.status(200).send({ bookmarked: true })
  })

  // DELETE /api/tweets/:id/bookmark  (idempotent)
  fastify.delete('/:id/bookmark', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const { id: tweetId } = request.params as { id: string }

    await prisma.bookmark.deleteMany({ where: { userId, tweetId } })
    return reply.status(204).send()
  })

  // GET /api/tweets/bookmarks — list current user's bookmarks
  fastify.get('/bookmarks/list', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub: userId } = request.user
    const query = request.query as { cursor?: string; limit?: string }
    const take = Math.min(Number(query.limit ?? 20), 50)

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        tweet: {
          include: {
            author: { select: AUTHOR_SELECT },
            likes: { where: { userId }, select: { userId: true } },
            retweets: { where: { userId }, select: { userId: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor
        ? {
            cursor: { userId_tweetId: { userId, tweetId: query.cursor } },
            skip: 1,
          }
        : {}),
    })

    const hasMore = bookmarks.length > take
    const data = hasMore ? bookmarks.slice(0, take) : bookmarks

    return reply.send({
      tweets: data.map((b) => formatTweet(b.tweet, userId)),
      nextCursor: hasMore ? data[data.length - 1].tweetId : null,
    })
  })
}

export default tweetRoutes

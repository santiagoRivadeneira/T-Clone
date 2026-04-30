import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { buildApp } from '../src/app'
import { cleanDatabase, createTestUser } from './helpers'

describe('Notification routes', () => {
  const app = buildApp()
  let tokenA: string   // actor
  let tokenB: string   // recipient
  let usernameA: string
  let tweetId: string

  beforeAll(async () => {
    await cleanDatabase()
    await app.ready()

    const a = await createTestUser(app)
    tokenA = a.token
    usernameA = a.user.username

    const b = await createTestUser(app)
    tokenB = b.token

    // B creates a tweet that A will like/retweet
    const tweetRes = await supertest(app.server)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Notify me when you interact!' })
    tweetId = tweetRes.body.tweet.id

    // A follows B → FOLLOW notification for B
    await supertest(app.server)
      .post(`/api/users/${(await createTestUser(app)).user.username}/follow`)
      .set('Authorization', `Bearer ${tokenA}`)

    // Trigger a LIKE notification: A likes B's tweet
    await supertest(app.server)
      .post(`/api/tweets/${tweetId}/like`)
      .set('Authorization', `Bearer ${tokenA}`)

    // Trigger a RETWEET notification: A retweets B's tweet
    await supertest(app.server)
      .post(`/api/tweets/${tweetId}/retweet`)
      .set('Authorization', `Bearer ${tokenA}`)

    // Trigger a REPLY notification: A replies to B's tweet
    await supertest(app.server)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Nice tweet!', replyToId: tweetId })
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/notifications', () => {
    it('returns notifications for the authenticated user', async () => {
      const res = await supertest(app.server)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.notifications)).toBe(true)
      expect(res.body).toHaveProperty('unreadCount')
      expect(res.body).toHaveProperty('nextCursor')
    })

    it('includes actor and tweet info in each notification', async () => {
      const res = await supertest(app.server)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      const notif = res.body.notifications[0]
      expect(notif).toHaveProperty('actor')
      expect(notif.actor).toHaveProperty('username')
      expect(notif).toHaveProperty('type')
      expect(notif).toHaveProperty('read')
      expect(notif).toHaveProperty('createdAt')
    })

    it('contains LIKE and RETWEET and REPLY notifications', async () => {
      const res = await supertest(app.server)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenB}`)
      const types = res.body.notifications.map((n: any) => n.type)
      expect(types).toContain('LIKE')
      expect(types).toContain('RETWEET')
      expect(types).toContain('REPLY')
    })

    it('supports cursor pagination', async () => {
      const res = await supertest(app.server)
        .get('/api/notifications?limit=1')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).get('/api/notifications')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/notifications/unread-count', () => {
    it('returns the unread notification count', async () => {
      const res = await supertest(app.server)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      expect(typeof res.body.count).toBe('number')
      expect(res.body.count).toBeGreaterThanOrEqual(0)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).get('/api/notifications/unread-count')
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/notifications/read', () => {
    it('marks all notifications as read', async () => {
      const res = await supertest(app.server)
        .patch('/api/notifications/read')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('unread count is 0 after marking as read', async () => {
      const res = await supertest(app.server)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.body.count).toBe(0)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).patch('/api/notifications/read')
      expect(res.status).toBe(401)
    })
  })

  describe('Self-notification guard', () => {
    it('does not notify yourself when liking your own tweet', async () => {
      const selfTweet = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'My own tweet' })

      const beforeCount = (
        await supertest(app.server)
          .get('/api/notifications/unread-count')
          .set('Authorization', `Bearer ${tokenA}`)
      ).body.count

      await supertest(app.server)
        .post(`/api/tweets/${selfTweet.body.tweet.id}/like`)
        .set('Authorization', `Bearer ${tokenA}`)

      const afterCount = (
        await supertest(app.server)
          .get('/api/notifications/unread-count')
          .set('Authorization', `Bearer ${tokenA}`)
      ).body.count

      expect(afterCount).toBe(beforeCount)
    })
  })
})

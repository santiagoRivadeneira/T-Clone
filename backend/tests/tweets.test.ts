import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { buildApp } from '../src/app'
import { cleanDatabase, createTestUser } from './helpers'

describe('Tweet routes', () => {
  const app = buildApp()
  let token: string
  let username: string

  beforeAll(async () => {
    await cleanDatabase()
    await app.ready()
    const u = await createTestUser(app)
    token = u.token
    username = u.user.username
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/tweets', () => {
    it('creates a tweet', async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Hello world!' })
      expect(res.status).toBe(201)
      expect(res.body.tweet.content).toBe('Hello world!')
      expect(res.body.tweet.liked).toBe(false)
      expect(res.body.tweet.likesCount).toBe(0)
    })

    it('rejects tweet over 280 characters', async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'a'.repeat(281) })
      expect(res.status).toBe(400)
    })

    it('rejects empty content', async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' })
      expect(res.status).toBe(400)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .send({ content: 'No auth' })
      expect(res.status).toBe(401)
    })

    it('creates a reply tweet', async () => {
      const parentRes = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Parent tweet' })
      const parentId = parentRes.body.tweet.id

      const replyRes = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'This is a reply', replyToId: parentId })
      expect(replyRes.status).toBe(201)
      expect(replyRes.body.tweet.replyToId).toBe(parentId)
    })

    it('rejects reply to non-existent tweet', async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Reply to ghost', replyToId: 'non-existent-id' })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/tweets/:id', () => {
    let tweetId: string

    beforeAll(async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Tweet to get' })
      tweetId = res.body.tweet.id
    })

    it('returns a tweet by id', async () => {
      const res = await supertest(app.server).get(`/api/tweets/${tweetId}`)
      expect(res.status).toBe(200)
      expect(res.body.tweet.content).toBe('Tweet to get')
      expect(res.body.tweet.replies).toBeDefined()
    })

    it('returns 404 for non-existent tweet', async () => {
      const res = await supertest(app.server).get('/api/tweets/does-not-exist')
      expect(res.status).toBe(404)
    })

    it('includes replies in response', async () => {
      const replyRes = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'A reply', replyToId: tweetId })
      expect(replyRes.status).toBe(201)

      const res = await supertest(app.server).get(`/api/tweets/${tweetId}`)
      expect(res.body.tweet.replies).toHaveLength(1)
      expect(res.body.tweet.replies[0].content).toBe('A reply')
    })
  })

  describe('DELETE /api/tweets/:id', () => {
    it('deletes own tweet', async () => {
      const createRes = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Delete me' })
      const id = createRes.body.tweet.id

      const res = await supertest(app.server)
        .delete(`/api/tweets/${id}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(204)
    })

    it("cannot delete another user's tweet", async () => {
      const other = await createTestUser(app)
      const createRes = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${other.token}`)
        .send({ content: 'Other user tweet' })
      const id = createRes.body.tweet.id

      const res = await supertest(app.server)
        .delete(`/api/tweets/${id}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(403)
    })

    it('returns 404 for non-existent tweet', async () => {
      const res = await supertest(app.server)
        .delete('/api/tweets/does-not-exist')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })
  })

  describe('Like / Unlike', () => {
    let tweetId: string

    beforeAll(async () => {
      const res = await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Like me!' })
      tweetId = res.body.tweet.id
    })

    it('likes a tweet', async () => {
      const res = await supertest(app.server)
        .post(`/api/tweets/${tweetId}/like`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(201)
      expect(res.body.liked).toBe(true)
    })

    it('cannot like the same tweet twice', async () => {
      const res = await supertest(app.server)
        .post(`/api/tweets/${tweetId}/like`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(409)
    })

    it('unlikes a tweet', async () => {
      const res = await supertest(app.server)
        .delete(`/api/tweets/${tweetId}/like`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(204)
    })

    it('returns 404 when unliking a non-liked tweet', async () => {
      const res = await supertest(app.server)
        .delete(`/api/tweets/${tweetId}/like`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })

    it('returns 404 when liking non-existent tweet', async () => {
      const res = await supertest(app.server)
        .post('/api/tweets/does-not-exist/like')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })

    it('requires auth to like', async () => {
      const res = await supertest(app.server).post(`/api/tweets/${tweetId}/like`)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/tweets/timeline', () => {
    let tokenA: string, tokenB: string, usernameA: string

    beforeAll(async () => {
      const a = await createTestUser(app)
      tokenA = a.token
      usernameA = a.user.username

      const b = await createTestUser(app)
      tokenB = b.token

      // A creates 3 tweets
      for (const content of ['Tweet A-1', 'Tweet A-2', 'Tweet A-3']) {
        await supertest(app.server)
          .post('/api/tweets')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ content })
      }

      // B follows A
      await supertest(app.server)
        .post(`/api/users/${usernameA}/follow`)
        .set('Authorization', `Bearer ${tokenB}`)
    })

    it('returns tweets from followed users', async () => {
      const res = await supertest(app.server)
        .get('/api/tweets/timeline')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      expect(res.body.tweets.length).toBeGreaterThanOrEqual(3)
    })

    it('does not include tweets from non-followed users', async () => {
      const c = await createTestUser(app)
      await supertest(app.server)
        .post('/api/tweets')
        .set('Authorization', `Bearer ${c.token}`)
        .send({ content: 'C tweet not in B timeline' })

      const res = await supertest(app.server)
        .get('/api/tweets/timeline')
        .set('Authorization', `Bearer ${tokenB}`)
      const contents = res.body.tweets.map((t: any) => t.content)
      expect(contents).not.toContain('C tweet not in B timeline')
    })

    it('supports cursor-based pagination', async () => {
      const first = await supertest(app.server)
        .get('/api/tweets/timeline?limit=2')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(first.body.nextCursor).toBeDefined()

      const second = await supertest(app.server)
        .get(`/api/tweets/timeline?limit=2&cursor=${first.body.nextCursor}`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(second.status).toBe(200)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).get('/api/tweets/timeline')
      expect(res.status).toBe(401)
    })
  })
})

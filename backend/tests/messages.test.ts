import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { buildApp } from '../src/app'
import { cleanDatabase, createTestUser } from './helpers'

describe('Message routes', () => {
  const app = buildApp()
  let tokenA: string
  let tokenB: string
  let usernameA: string
  let usernameB: string

  beforeAll(async () => {
    await cleanDatabase()
    await app.ready()

    const a = await createTestUser(app)
    tokenA = a.token
    usernameA = a.user.username

    const b = await createTestUser(app)
    tokenB = b.token
    usernameB = b.user.username
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/messages/:username', () => {
    it('sends a message and returns 201', async () => {
      const res = await supertest(app.server)
        .post(`/api/messages/${usernameB}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Hello!' })
      expect(res.status).toBe(201)
      expect(res.body.message).toHaveProperty('id')
      expect(res.body.message.content).toBe('Hello!')
    })

    it('returns 404 for non-existent recipient', async () => {
      const res = await supertest(app.server)
        .post('/api/messages/nobody_xyz')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Hello?' })
      expect(res.status).toBe(404)
    })

    it('returns 400 when messaging yourself', async () => {
      const res = await supertest(app.server)
        .post(`/api/messages/${usernameA}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Talking to myself' })
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty content', async () => {
      const res = await supertest(app.server)
        .post(`/api/messages/${usernameB}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '' })
      expect(res.status).toBe(400)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server)
        .post(`/api/messages/${usernameB}`)
        .send({ content: 'No token' })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/messages', () => {
    it('returns conversations list', async () => {
      const res = await supertest(app.server)
        .get('/api/messages')
        .set('Authorization', `Bearer ${tokenA}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.conversations)).toBe(true)
      expect(res.body.conversations.length).toBeGreaterThan(0)
    })

    it('includes user and lastMessage in each conversation', async () => {
      const res = await supertest(app.server)
        .get('/api/messages')
        .set('Authorization', `Bearer ${tokenA}`)
      const conv = res.body.conversations[0]
      expect(conv).toHaveProperty('user')
      expect(conv).toHaveProperty('lastMessage')
      expect(conv).toHaveProperty('unreadCount')
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).get('/api/messages')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/messages/unread-count', () => {
    it('returns numeric unread count', async () => {
      const res = await supertest(app.server)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      expect(typeof res.body.count).toBe('number')
      expect(res.body.count).toBeGreaterThanOrEqual(0)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).get('/api/messages/unread-count')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/messages/:username', () => {
    it('returns messages in a conversation', async () => {
      const res = await supertest(app.server)
        .get(`/api/messages/${usernameB}`)
        .set('Authorization', `Bearer ${tokenA}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.messages)).toBe(true)
      expect(res.body).toHaveProperty('partner')
      expect(res.body).toHaveProperty('nextCursor')
    })

    it('marks unread messages as read when fetching', async () => {
      // A sends B a fresh message (unread for B)
      await supertest(app.server)
        .post(`/api/messages/${usernameB}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Are you there?' })

      const beforeRes = await supertest(app.server)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenB}`)
      const before = beforeRes.body.count
      expect(before).toBeGreaterThan(0)

      // B opens the conversation → messages should be marked read
      await supertest(app.server)
        .get(`/api/messages/${usernameA}`)
        .set('Authorization', `Bearer ${tokenB}`)

      const afterRes = await supertest(app.server)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(afterRes.body.count).toBeLessThan(before)
    })

    it('supports cursor pagination', async () => {
      const res = await supertest(app.server)
        .get(`/api/messages/${usernameB}?limit=1`)
        .set('Authorization', `Bearer ${tokenA}`)
      expect(res.status).toBe(200)
    })

    it('returns 404 for non-existent user', async () => {
      const res = await supertest(app.server)
        .get('/api/messages/nobody_xyz')
        .set('Authorization', `Bearer ${tokenA}`)
      expect(res.status).toBe(404)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).get(`/api/messages/${usernameB}`)
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/messages/:username/read', () => {
    it('marks conversation as read and returns ok', async () => {
      const res = await supertest(app.server)
        .patch(`/api/messages/${usernameA}/read`)
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('returns 404 for non-existent user', async () => {
      const res = await supertest(app.server)
        .patch('/api/messages/nobody_xyz/read')
        .set('Authorization', `Bearer ${tokenB}`)
      expect(res.status).toBe(404)
    })

    it('requires authentication', async () => {
      const res = await supertest(app.server).patch(`/api/messages/${usernameA}/read`)
      expect(res.status).toBe(401)
    })
  })
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { buildApp } from '../src/app'
import { cleanDatabase } from './helpers'

describe('Auth routes', () => {
  const app = buildApp()

  beforeAll(async () => {
    await cleanDatabase()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns token', async () => {
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'register@example.com',
        username: 'reguser',
        displayName: 'Reg User',
        password: 'password123',
      })
      expect(res.status).toBe(201)
      expect(res.body.user.email).toBe('register@example.com')
      expect(res.body.user.passwordHash).toBeUndefined()
      expect(res.body.token).toBeDefined()
    })

    it('rejects duplicate email', async () => {
      await supertest(app.server).post('/api/auth/register').send({
        email: 'dupe@example.com',
        username: 'dupeuser1',
        displayName: 'Dupe 1',
        password: 'password123',
      })
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'dupe@example.com',
        username: 'dupeuser2',
        displayName: 'Dupe 2',
        password: 'password123',
      })
      expect(res.status).toBe(409)
    })

    it('rejects duplicate username', async () => {
      await supertest(app.server).post('/api/auth/register').send({
        email: 'unique1@example.com',
        username: 'sameusername',
        displayName: 'User 1',
        password: 'password123',
      })
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'unique2@example.com',
        username: 'sameusername',
        displayName: 'User 2',
        password: 'password123',
      })
      expect(res.status).toBe(409)
    })

    it('rejects invalid email format', async () => {
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'not-an-email',
        username: 'validuser',
        displayName: 'Valid',
        password: 'password123',
      })
      expect(res.status).toBe(400)
    })

    it('rejects short password (< 8 chars)', async () => {
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'short@example.com',
        username: 'shortpass',
        displayName: 'Short Pass',
        password: '1234567',
      })
      expect(res.status).toBe(400)
    })

    it('rejects username with special characters', async () => {
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'special@example.com',
        username: 'user name!',
        displayName: 'Special',
        password: 'password123',
      })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await supertest(app.server).post('/api/auth/register').send({
        email: 'login@example.com',
        username: 'loginuser',
        displayName: 'Login User',
        password: 'password123',
      })
    })

    it('returns token with correct credentials', async () => {
      const res = await supertest(app.server).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.passwordHash).toBeUndefined()
    })

    it('rejects wrong password', async () => {
      const res = await supertest(app.server).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'wrongpassword',
      })
      expect(res.status).toBe(401)
    })

    it('rejects non-existent email', async () => {
      const res = await supertest(app.server).post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    let token: string

    beforeAll(async () => {
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'me@example.com',
        username: 'meuser',
        displayName: 'Me User',
        password: 'password123',
      })
      token = res.body.token
    })

    it('returns current user with valid token', async () => {
      const res = await supertest(app.server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.user.username).toBe('meuser')
      expect(res.body.user._count).toBeDefined()
    })

    it('returns 401 without token', async () => {
      const res = await supertest(app.server).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('returns 401 with invalid token', async () => {
      const res = await supertest(app.server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/auth/me', () => {
    let token: string

    beforeAll(async () => {
      const res = await supertest(app.server).post('/api/auth/register').send({
        email: 'patch@example.com',
        username: 'patchuser',
        displayName: 'Patch User',
        password: 'password123',
      })
      token = res.body.token
    })

    it('updates bio and displayName', async () => {
      const res = await supertest(app.server)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'My new bio', displayName: 'Updated Name' })
      expect(res.status).toBe(200)
      expect(res.body.user.bio).toBe('My new bio')
      expect(res.body.user.displayName).toBe('Updated Name')
    })

    it('rejects bio over 160 chars', async () => {
      const res = await supertest(app.server)
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'a'.repeat(161) })
      expect(res.status).toBe(400)
    })
  })
})

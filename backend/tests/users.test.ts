import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { buildApp } from '../src/app'
import { cleanDatabase, createTestUser } from './helpers'

describe('User routes', () => {
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

  // ─── Search ───────────────────────────────────────────────────────────────
  describe('GET /api/users/search', () => {
    beforeAll(async () => {
      await createTestUser(app, { username: 'alice_dev', displayName: 'Alice Developer' })
      await createTestUser(app, { username: 'bob_design', displayName: 'Bob Designer' })
    })

    it('finds users by username', async () => {
      const res = await supertest(app.server).get('/api/users/search?q=alice')
      expect(res.status).toBe(200)
      expect(res.body.users.some((u: any) => u.username === 'alice_dev')).toBe(true)
    })

    it('finds users by displayName', async () => {
      const res = await supertest(app.server).get('/api/users/search?q=Designer')
      expect(res.status).toBe(200)
      expect(res.body.users.some((u: any) => u.username === 'bob_design')).toBe(true)
    })

    it('returns empty array for no match', async () => {
      const res = await supertest(app.server).get('/api/users/search?q=zzznomatch')
      expect(res.status).toBe(200)
      expect(res.body.users).toHaveLength(0)
    })

    it('returns empty array without query', async () => {
      const res = await supertest(app.server).get('/api/users/search')
      expect(res.status).toBe(200)
      expect(res.body.users).toHaveLength(0)
    })

    it('includes isFollowing flag when authenticated', async () => {
      const res = await supertest(app.server)
        .get('/api/users/search?q=alice')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.users[0]).toHaveProperty('isFollowing')
    })
  })

  // ─── Profile ──────────────────────────────────────────────────────────────
  describe('GET /api/users/:username', () => {
    it('returns user profile', async () => {
      const res = await supertest(app.server).get(`/api/users/${username}`)
      expect(res.status).toBe(200)
      expect(res.body.user.username).toBe(username)
      expect(res.body.user._count).toBeDefined()
    })

    it('returns 404 for non-existent user', async () => {
      const res = await supertest(app.server).get('/api/users/doesnotexist999')
      expect(res.status).toBe(404)
    })

    it('includes isFollowing flag when authenticated', async () => {
      const target = await createTestUser(app)
      await supertest(app.server)
        .post(`/api/users/${target.user.username}/follow`)
        .set('Authorization', `Bearer ${token}`)

      const res = await supertest(app.server)
        .get(`/api/users/${target.user.username}`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.body.user.isFollowing).toBe(true)
    })

    it('isFollowing is false for unauthenticated requests', async () => {
      const res = await supertest(app.server).get(`/api/users/${username}`)
      expect(res.body.user.isFollowing).toBe(false)
    })
  })

  // ─── User tweets ──────────────────────────────────────────────────────────
  describe('GET /api/users/:username/tweets', () => {
    let tweetUsername: string
    let tweetToken: string

    beforeAll(async () => {
      const u = await createTestUser(app)
      tweetUsername = u.user.username
      tweetToken = u.token
      for (const content of ['U tweet 1', 'U tweet 2', 'U tweet 3']) {
        await supertest(app.server)
          .post('/api/tweets')
          .set('Authorization', `Bearer ${tweetToken}`)
          .send({ content })
      }
    })

    it("returns user's tweets", async () => {
      const res = await supertest(app.server).get(`/api/users/${tweetUsername}/tweets`)
      expect(res.status).toBe(200)
      expect(res.body.tweets.length).toBeGreaterThanOrEqual(3)
    })

    it('supports cursor pagination', async () => {
      const first = await supertest(app.server)
        .get(`/api/users/${tweetUsername}/tweets?limit=2`)
      expect(first.body.nextCursor).toBeDefined()

      const second = await supertest(app.server)
        .get(`/api/users/${tweetUsername}/tweets?limit=2&cursor=${first.body.nextCursor}`)
      expect(second.status).toBe(200)
    })

    it('returns 404 for non-existent user', async () => {
      const res = await supertest(app.server).get('/api/users/ghost999/tweets')
      expect(res.status).toBe(404)
    })
  })

  // ─── Follow / Unfollow (idempotent) ───────────────────────────────────────
  describe('Follow / Unfollow', () => {
    let followerToken: string
    let targetUsername: string

    beforeAll(async () => {
      const follower = await createTestUser(app)
      followerToken = follower.token

      const target = await createTestUser(app)
      targetUsername = target.user.username
    })

    it('follows a user', async () => {
      const res = await supertest(app.server)
        .post(`/api/users/${targetUsername}/follow`)
        .set('Authorization', `Bearer ${followerToken}`)
      expect(res.status).toBe(200)
      expect(res.body.following).toBe(true)
    })

    it('following the same user twice is idempotent (200)', async () => {
      const res = await supertest(app.server)
        .post(`/api/users/${targetUsername}/follow`)
        .set('Authorization', `Bearer ${followerToken}`)
      expect(res.status).toBe(200)
    })

    it('cannot follow yourself', async () => {
      const u = await createTestUser(app)
      const res = await supertest(app.server)
        .post(`/api/users/${u.user.username}/follow`)
        .set('Authorization', `Bearer ${u.token}`)
      expect(res.status).toBe(400)
    })

    it('returns followers list', async () => {
      const res = await supertest(app.server).get(`/api/users/${targetUsername}/followers`)
      expect(res.status).toBe(200)
      expect(res.body.users.length).toBeGreaterThanOrEqual(1)
    })

    it('returns following list', async () => {
      const follower = await createTestUser(app)
      const target = await createTestUser(app)
      await supertest(app.server)
        .post(`/api/users/${target.user.username}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)

      const res = await supertest(app.server)
        .get(`/api/users/${follower.user.username}/following`)
      expect(res.status).toBe(200)
      expect(res.body.users.some((u: any) => u.username === target.user.username)).toBe(true)
    })

    it('unfollows a user', async () => {
      const res = await supertest(app.server)
        .delete(`/api/users/${targetUsername}/follow`)
        .set('Authorization', `Bearer ${followerToken}`)
      expect(res.status).toBe(204)
    })

    it('unfollowing someone not followed is idempotent (204)', async () => {
      const res = await supertest(app.server)
        .delete(`/api/users/${targetUsername}/follow`)
        .set('Authorization', `Bearer ${followerToken}`)
      expect(res.status).toBe(204)
    })

    it('returns 404 for non-existent user on follow', async () => {
      const res = await supertest(app.server)
        .post('/api/users/ghost999/follow')
        .set('Authorization', `Bearer ${followerToken}`)
      expect(res.status).toBe(404)
    })

    it('requires auth to follow', async () => {
      const res = await supertest(app.server).post(`/api/users/${targetUsername}/follow`)
      expect(res.status).toBe(401)
    })

    it('requires auth to unfollow', async () => {
      const res = await supertest(app.server).delete(`/api/users/${targetUsername}/follow`)
      expect(res.status).toBe(401)
    })
  })
})

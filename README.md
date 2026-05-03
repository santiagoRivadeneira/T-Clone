# TClone — Twitter/X Clone

A full-stack Twitter/X clone built for **The Flock** technical challenge. Features authentication, tweet CRUD, timelines with cursor-based pagination, follow/unfollow, likes, user search, reply threads, and a Docker-based deployment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query v5, React Router v6 |
| Backend | Fastify v4, Prisma ORM, PostgreSQL 16, Zod |
| Auth | JWT (custom, no Firebase/Supabase) + bcrypt |
| Testing | Vitest + Supertest (backend), Vitest + RTL (frontend) |
| Deployment | Docker + Docker Compose, nginx |

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** >= 14 (for local dev) OR **Docker + Docker Compose** (for Docker setup)

---

## Option A — Run with Docker (recommended)

No local PostgreSQL required. Everything runs in containers.

```bash
# 1. Clone the repo
git clone <repo-url>
cd twitter-clon

# 2. (Optional) Set a custom JWT secret
export JWT_SECRET=my-secret-key   # or add to a .env file

# 3. Start all services (postgres + backend + frontend)
docker compose up --build

# 4. Open the app
open http://localhost
```

The backend runs on port 3000, the frontend on port 80. Migrations and seed data run automatically on first start.

To stop and remove volumes (full reset):

```bash
docker compose down -v
```

---

## Option B — Local Development

### 1. Backend

```bash
# Install dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local PostgreSQL instance

# Run migrations
npm run db:migrate

# Seed the database (10 users, ~40 tweets, follows, likes)
npm run db:seed

# Start the backend (port 3000, hot-reload)
npm run dev
```

### 2. Frontend

In a second terminal, from the repo root:

```bash
# Install dependencies
npm install

# Start the frontend dev server (port 5173, proxies /api → localhost:3000)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `PORT` | `3000` | Fastify listen port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `NODE_ENV` | `development` | `development` / `test` / `production` |

Example `backend/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/twitter_clon
JWT_SECRET=my-super-secret-key
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## Demo Credentials

All seed users share the same password: **`password123`**

| Name | Email | Username |
|---|---|---|
| Alex Dev | alex@example.com | @alexdev |
| Maria Sol | maria@example.com | @mariasol |
| Carlos IA | carlos@example.com | @carlos_ia |
| Luisa Code | luisa@example.com | @luisa_code |
| Rafa PM | rafa@example.com | @rafa_pm |
| Ana DevRel | ana@example.com | @ana_devrel |
| Pablo Ent | pablo@example.com | @pablo_ent |
| Julia Data | julia@example.com | @julia_data |
| Miguel Sec | miguel@example.com | @miguel_sec |
| Sofia Front | sofia@example.com | @sofia_front |

---

## Running Tests

### Backend tests (Vitest + Supertest)

Requires a running PostgreSQL instance. By default uses the `twitter_clon_test` database.

```bash
cd backend

# Run all tests
npm test

# Run with coverage (target: >= 80% line coverage)
npm run test:coverage

# Watch mode
npm run test:watch
```

The test database URL is configured in `backend/vitest.config.ts`.

### Frontend tests (Vitest + React Testing Library)

No database required — all API calls are mocked.

```bash
# From repo root
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Frontend test files:
- `src/tests/Login.test.jsx` — Login/register form, validation, API call assertions
- `src/tests/PostComposer.test.jsx` — Post creation, reply mode, error handling
- `src/tests/Follow.test.jsx` — Follow/unfollow flow, optimistic updates, like interactions

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

> **Pagination** — pass `?cursor=<id>` to fetch the next page. All paginated responses include `nextCursor` (null when the last page is reached). Default page size is 20; maximum is 50 via `?limit=`.

---

### Auth

#### `POST /api/auth/register`

Creates a new user account and returns a JWT.

**Request body**
```json
{
  "email": "user@example.com",
  "username": "alexdev",
  "displayName": "Alex Dev",
  "password": "password123"
}
```

| Field | Type | Constraints |
|---|---|---|
| `email` | string | valid email |
| `username` | string | 3–15 chars, letters/numbers/underscores only |
| `displayName` | string | 1–50 chars |
| `password` | string | min 8 chars |

**Response `201`**
```json
{
  "user": {
    "id": "clxyz123",
    "email": "user@example.com",
    "username": "alexdev",
    "displayName": "Alex Dev",
    "avatarUrl": null,
    "bio": null,
    "createdAt": "2026-05-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors** — `409` email or username already taken · `400` validation error

---

#### `POST /api/auth/login`

Authenticates an existing user and returns a JWT valid for 7 days.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `200`**
```json
{
  "user": {
    "id": "clxyz123",
    "email": "user@example.com",
    "username": "alexdev",
    "displayName": "Alex Dev",
    "avatarUrl": null,
    "bio": null,
    "createdAt": "2026-05-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors** — `401` invalid credentials

---

#### `GET /api/auth/me` 🔒

Returns the authenticated user's profile including follower/tweet counts.

**Response `200`**
```json
{
  "user": {
    "id": "clxyz123",
    "email": "user@example.com",
    "username": "alexdev",
    "displayName": "Alex Dev",
    "avatarUrl": null,
    "bio": "Full-stack dev",
    "createdAt": "2026-05-01T12:00:00.000Z",
    "_count": {
      "followers": 42,
      "following": 18,
      "tweets": 7
    }
  }
}
```

---

#### `PATCH /api/auth/me` 🔒

Updates the authenticated user's profile. All fields are optional.

**Request body**
```json
{
  "displayName": "Alex Developer",
  "bio": "Building things on the web",
  "avatarUrl": "https://example.com/avatar.png"
}
```

| Field | Type | Constraints |
|---|---|---|
| `displayName` | string | 1–50 chars |
| `bio` | string | max 160 chars |
| `avatarUrl` | string | valid URL or empty string |

**Response `200`** — updated user object (same shape as `GET /me`, without `_count`)

---

### Tweets

#### `GET /api/tweets/timeline` 🔒

Returns top-level tweets from users the authenticated user follows, newest first.

**Query params** — `?cursor=<tweetId>` · `?limit=20` (max 50)

**Response `200`**
```json
{
  "tweets": [
    {
      "id": "tweet123",
      "content": "Hello world!",
      "imageUrl": null,
      "replyToId": null,
      "createdAt": "2026-05-01T13:00:00.000Z",
      "author": {
        "id": "clxyz123",
        "username": "alexdev",
        "displayName": "Alex Dev",
        "avatarUrl": null
      },
      "liked": false,
      "retweeted": false,
      "bookmarked": false,
      "likesCount": 5,
      "repliesCount": 2,
      "retweetsCount": 1
    }
  ],
  "nextCursor": "tweet456"
}
```

---

#### `POST /api/tweets` 🔒

Creates a new tweet. Set `replyToId` to post a reply.

**Request body**
```json
{
  "content": "Hello world!",
  "replyToId": "tweet456",
  "imageUrl": "https://example.com/image.png"
}
```

| Field | Type | Constraints |
|---|---|---|
| `content` | string | 1–280 chars (trimmed) |
| `replyToId` | string | optional — ID of the tweet being replied to |
| `imageUrl` | string | optional — valid URL |

**Response `201`** — `{ "tweet": { ...tweet object } }`

**Errors** — `404` parent tweet not found (when `replyToId` is set) · `400` validation error

---

#### `GET /api/tweets/:id`

Returns a single tweet with up to 50 replies nested inside. Auth is optional; if a valid token is provided, `liked`/`retweeted`/`bookmarked` flags reflect the caller's state.

**Response `200`**
```json
{
  "tweet": {
    "id": "tweet123",
    "content": "Hello world!",
    "imageUrl": null,
    "replyToId": null,
    "createdAt": "2026-05-01T13:00:00.000Z",
    "author": { "id": "...", "username": "alexdev", "displayName": "Alex Dev", "avatarUrl": null },
    "liked": true,
    "retweeted": false,
    "bookmarked": false,
    "likesCount": 5,
    "repliesCount": 2,
    "retweetsCount": 1,
    "replies": [
      {
        "id": "tweet789",
        "content": "Great post!",
        "replyToId": "tweet123",
        "author": { "id": "...", "username": "mariasol", "displayName": "Maria Sol", "avatarUrl": null },
        "liked": false,
        "retweeted": false,
        "bookmarked": false,
        "likesCount": 0,
        "repliesCount": 0,
        "retweetsCount": 0,
        "createdAt": "2026-05-01T14:00:00.000Z"
      }
    ]
  }
}
```

**Errors** — `404` tweet not found

---

#### `DELETE /api/tweets/:id` 🔒

Deletes the caller's own tweet. **Response `204` No Content.**

**Errors** — `403` not the tweet's author · `404` tweet not found

---

#### `POST /api/tweets/:id/like` 🔒

Likes a tweet. Idempotent — calling it on an already-liked tweet is a no-op.

**Response `200`**
```json
{ "liked": true }
```

---

#### `DELETE /api/tweets/:id/like` 🔒

Unlikes a tweet. Idempotent. **Response `204` No Content.**

---

#### `POST /api/tweets/:id/retweet` 🔒

Retweets a tweet. Idempotent.

**Response `200`**
```json
{ "retweeted": true }
```

---

#### `DELETE /api/tweets/:id/retweet` 🔒

Undoes a retweet. Idempotent. **Response `204` No Content.**

---

#### `POST /api/tweets/:id/bookmark` 🔒

Saves a tweet to the caller's bookmarks. Idempotent.

**Response `200`**
```json
{ "bookmarked": true }
```

---

#### `DELETE /api/tweets/:id/bookmark` 🔒

Removes a tweet from the caller's bookmarks. Idempotent. **Response `204` No Content.**

---

#### `GET /api/tweets/bookmarks/list` 🔒

Returns the authenticated user's bookmarked tweets, newest first.

**Query params** — `?cursor=<tweetId>` · `?limit=20` (max 50)

**Response `200`** — same shape as `/timeline` (`{ tweets: [...], nextCursor }`)

---

### Users

#### `GET /api/users/search?q=` 🔒

Searches users by username or display name (case-insensitive, partial match). Returns up to 20 results.

**Query params** — `?q=alex` (max 100 chars)

**Response `200`**
```json
{
  "users": [
    {
      "id": "clxyz123",
      "username": "alexdev",
      "displayName": "Alex Dev",
      "avatarUrl": null,
      "bio": "Full-stack dev",
      "isFollowing": false
    }
  ]
}
```

---

#### `GET /api/users/:username`

Returns a user's public profile. Auth is optional; if authenticated, includes `isFollowing`.

**Response `200`**
```json
{
  "user": {
    "id": "clxyz123",
    "username": "alexdev",
    "displayName": "Alex Dev",
    "avatarUrl": null,
    "bio": "Full-stack dev",
    "createdAt": "2026-05-01T12:00:00.000Z",
    "isFollowing": true,
    "_count": {
      "followers": 42,
      "following": 18,
      "tweets": 7
    }
  }
}
```

**Errors** — `404` user not found

---

#### `GET /api/users/:username/tweets`

Returns a user's top-level tweets (no replies), newest first.

**Query params** — `?cursor=<tweetId>` · `?limit=20` (max 50)

**Response `200`** — same shape as `/timeline`

---

#### `GET /api/users/:username/followers`

Returns users who follow the given account.

**Response `200`**
```json
{
  "users": [
    { "id": "...", "username": "mariasol", "displayName": "Maria Sol", "avatarUrl": null, "bio": null }
  ]
}
```

---

#### `GET /api/users/:username/following`

Returns users that the given account follows. Same response shape as `/followers`.

---

#### `POST /api/users/:username/follow` 🔒

Follows a user. Idempotent. Cannot follow yourself.

**Response `200`**
```json
{ "following": true }
```

**Errors** — `400` cannot follow yourself · `404` user not found

---

#### `DELETE /api/users/:username/follow` 🔒

Unfollows a user. Idempotent. **Response `204` No Content.**

---

### Notifications

#### `GET /api/notifications` 🔒

Returns the authenticated user's notifications (likes, retweets, replies, follows), newest first. Also includes the current unread count.

**Query params** — `?cursor=<notificationId>` · `?limit=20` (max 50)

**Response `200`**
```json
{
  "notifications": [
    {
      "id": "notif123",
      "type": "LIKE",
      "read": false,
      "createdAt": "2026-05-01T15:00:00.000Z",
      "actor": {
        "id": "...",
        "username": "mariasol",
        "displayName": "Maria Sol",
        "avatarUrl": null
      },
      "tweet": {
        "id": "tweet123",
        "content": "Hello world!"
      }
    }
  ],
  "nextCursor": "notif456",
  "unreadCount": 3
}
```

Notification `type` values: `LIKE` · `RETWEET` · `REPLY` · `FOLLOW`

---

#### `GET /api/notifications/unread-count` 🔒

Lightweight polling endpoint for the sidebar badge.

**Response `200`**
```json
{ "count": 3 }
```

---

#### `PATCH /api/notifications/read` 🔒

Marks all unread notifications as read.

**Response `200`**
```json
{ "ok": true }
```

---

### Real-time (Server-Sent Events)

#### `GET /api/stream?token=<jwt>`

Opens a persistent SSE connection for the authenticated user. The JWT is passed as a query parameter (not a header) because the browser's `EventSource` API does not support custom headers.

```
GET /api/stream?token=eyJhbGci...
Accept: text/event-stream
```

The server sends a `retry: 3000` directive on connect and a keep-alive comment (`: ping`) every 25 seconds.

**Event types**

| Event | Payload | Description |
|---|---|---|
| `new-tweet` | tweet object | A followed user posted a new top-level tweet |
| `delete-tweet` | `{ "id": "tweet123" }` | A followed user deleted a tweet |
| `new-notification` | notification object | A new notification arrived for the user |

**Example stream**

```
retry: 3000

event: new-tweet
data: {"id":"tweet999","content":"Live update!","author":{...},...}

: ping

event: new-notification
data: {"id":"notif789","type":"LIKE","actor":{...},"tweet":{...}}
```

**Errors** — `401` missing or invalid token

---

## Project Structure

```
twitter-clon/
├── src/                    # Frontend (React)
│   ├── components/
│   │   ├── layout/         # Sidebar, MobileNav, MainLayout
│   │   ├── post/           # PostCard, PostComposer, ReplyModal
│   │   └── ui/             # Radix UI primitives (Button, Input, Avatar…)
│   ├── context/            # AuthContext, ThemeContext
│   ├── lib/
│   │   ├── api.js          # Centralized fetch wrapper + typed API client
│   │   └── utils.js        # cn(), formatCount(), formatTimeAgo()
│   ├── pages/              # Home, Explore, Profile, PostDetail, Settings…
│   └── tests/              # Frontend test suite
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Data models (User, Tweet, Like, Follow)
│   │   ├── migrations/     # SQL migration history
│   │   └── seed.ts         # 10 users + sample data
│   ├── src/
│   │   ├── app.ts          # Fastify factory (testable, no listen())
│   │   ├── index.ts        # Entry point (calls listen())
│   │   ├── middleware/     # authenticate.ts (JWT guard)
│   │   └── routes/         # auth.ts, tweets.ts, users.ts
│   └── tests/              # Backend integration test suite
├── docker-compose.yml      # postgres + backend + frontend
├── Dockerfile              # Frontend nginx build
└── backend/Dockerfile      # Backend Node build
```

---

## Bonus Features

### Reply Threads
Tweets support `replyToId` in the schema. `GET /api/tweets/:id` returns the tweet with its `replies[]` array. The `PostComposer` component accepts a `replyToId` prop and switches to reply mode automatically.

### Dark / Light Mode
Theme toggle available in the sidebar dropdown and Settings → Appearance. Preference is persisted to `localStorage`.

### Docker Deployment
`docker compose up --build` starts postgres, backend (with migrations + seed), and an nginx-served frontend. The backend uses a multi-stage Dockerfile; the frontend compiles with Vite and is served by nginx.

---

## Technical Decisions

**Fastify over Express** — Fastify has a typed plugin system, built-in schema serialization, and higher throughput. Separating `buildApp()` from `listen()` lets integration tests use `supertest` directly against the app instance without opening a port.

**Cursor-based pagination** — Offset pagination breaks when rows are inserted mid-page. Cursors based on the last seen tweet ID are stable, efficient with a B-tree index on `(createdAt, id)`, and produce consistent results under concurrent writes.

**Zod for validation** — Zod schemas serve as both runtime validators and TypeScript type sources, eliminating duplication. The global error handler in `app.ts` catches `ZodError` and returns structured 400 responses automatically.

**Optimistic UI updates** — Likes and follows update local React state immediately before the API call resolves, then roll back on failure. The UI stays responsive without sacrificing data correctness.

**TanStack Query for server state** — Keeps server state (timelines, profiles, tweet threads) normalized in a cache. Mutations call `invalidateQueries` to trigger fresh fetches, so all views stay consistent after writes.

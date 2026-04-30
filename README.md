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

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login, returns JWT |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `PATCH` | `/api/auth/me` | Yes | Update profile |

### Tweets

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tweets/timeline` | Yes | Paginated following timeline |
| `POST` | `/api/tweets` | Yes | Create tweet (or reply with `replyToId`) |
| `GET` | `/api/tweets/:id` | Yes | Get tweet with replies |
| `DELETE` | `/api/tweets/:id` | Yes | Delete own tweet |
| `POST` | `/api/tweets/:id/like` | Yes | Like a tweet |
| `DELETE` | `/api/tweets/:id/like` | Yes | Unlike a tweet |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/search?q=` | Yes | Search users by name/username |
| `GET` | `/api/users/:username` | Yes | Get user profile |
| `GET` | `/api/users/:username/tweets` | Yes | User's tweets (paginated) |
| `GET` | `/api/users/:username/followers` | Yes | Followers list |
| `GET` | `/api/users/:username/following` | Yes | Following list |
| `POST` | `/api/users/:username/follow` | Yes | Follow a user |
| `DELETE` | `/api/users/:username/follow` | Yes | Unfollow a user |

Pagination: pass `?cursor=<tweetId>` to get the next page. Response includes `nextCursor` (null when exhausted).

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

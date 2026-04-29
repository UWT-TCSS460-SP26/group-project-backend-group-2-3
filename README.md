# TCSS 460 Group 2 Backend

Express and TypeScript API for the Movie and TV Review Platform group project.

## Sprint 0 Endpoints

- Heartbeat: `GET /health`
- API docs: `GET /api-docs`
- Versioned API base routes: `GET /v1/*`, `GET /v2/*`
- Backward-compatible aliases: `GET /api/v1/*`, `GET /api/v2/*`, and unversioned `/*` (v1)

Local docs are available at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

## Quick Start

```bash
npm install
npm run dev
```

The server uses `PORT` from the environment and defaults to `3000`.

Copy `.env.example` to `.env` for local development and fill in:

- `TMDB_API_KEY` for Sprint 1 TMDB proxy routes.
- `DATABASE_URL` for the local PostgreSQL database used by Prisma.
- `JWT_SECRET` for Sprint 2 dev auth token signing.

Sprint 2 local auth is mounted at `POST /auth/dev-login`. It creates or reuses a local user
and returns a JWT plus the user payload for testing protected routes.

## Sprint 2 Database Setup

After `DATABASE_URL` is configured, apply the committed migrations and seed the local admin user:

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed is idempotent. It guarantees an admin account with username `admin` and email
`admin@dev.local`. To mint an admin JWT locally, call `POST /auth/dev-login` with:

```json
{ "username": "admin" }
```

When the Prisma schema changes, run `npx prisma migrate dev --name <short-change-name>` and commit
the updated `prisma/schema.prisma` plus the generated `prisma/migrations/...` folder. When seed data
changes, update `prisma/seed.ts` and rerun `npx prisma db seed`; the seed script should remain safe
to run more than once on a teammate's local database.

## Route and Controller Layout

The project now follows the checkoff-style versioned structure:

- `src/routes/v1/index.ts` and `src/routes/v2/index.ts` mount each version's routes
- `src/routes/v1/*.ts` and `src/routes/v2/*.ts` define endpoints for each version
- `src/controllers/v1/*.ts` and `src/controllers/v2/*.ts` are used where handlers are split from routes

## Shared Contracts

- Auth role and JWT payload types live in `src/types/auth.ts`.
- API error response types and status constants live in `src/types/api.ts`.
- Controllers should pass expected failures with `next(new HttpError(status, message))`.
- The global error middleware maps errors through `src/errors/error-mapper.ts` so responses use
  the standard `{ "error": "message" }` shape.
- Owner checks for mutation routes should use `assertOwner` or `assertOwnerOrAdmin` from
  `src/utils/authorization.ts`. `DELETE /reviews/:id` should use the owner-or-admin helper.

## Scripts

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start dev server with auto-reload |
| `npm run build`        | Compile TypeScript to `dist/`     |
| `npm start`            | Run compiled output               |
| `npm test`             | Run tests                         |
| `npm run lint`         | Run ESLint                        |
| `npm run format`       | Format code with Prettier         |
| `npm run format:check` | Check formatting                  |

## Deployed URL

`https://group-2-9289.onrender.com/`

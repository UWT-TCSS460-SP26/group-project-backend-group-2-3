# TCSS 460 Group 2 Backend

Express and TypeScript API for the Movie and TV Review Platform group project.

## Endpoints

- Health: `GET /health`
- API docs: `GET /api-docs`
- Versioned API base: `/v1/*` (also accessible as `/api/v1/*` and `/*`)
- Bug reports: `POST /v1/issues` (public — no auth required)

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
- `AUTH_ISSUER` and `API_AUDIENCE` for Auth2 bearer token verification.
- `CORS_ALLOWED_ORIGINS` as a comma-separated list of browser origins allowed to call the API.

## Sprint 2 Database Setup

After `DATABASE_URL` is configured, apply the committed migrations and seed the local admin user:

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed is idempotent. It guarantees an admin account with username `admin` and email
`admin@dev.local`.

The Sprint 3 migration backfills existing local Sprint 2 users with `legacy-user-<id>` subject IDs,
then new authenticated writes link Auth2 subjects to local numeric `User.id` rows. Teammates should
not need to reset local dev data unless they have manual duplicate usernames or emails.

When the Prisma schema changes, run `npx prisma migrate dev --name <short-change-name>` and commit
the updated `prisma/schema.prisma` plus the generated `prisma/migrations/...` folder. When seed data
changes, update `prisma/seed.ts` and rerun `npx prisma db seed`; the seed script should remain safe
to run more than once on a teammate's local database.

## Route and Controller Layout

The project now uses v1 as the single active API surface:

- `src/routes/v1/index.ts` mounts the active route families.
- `src/routes/v1/*.ts` defines endpoints for each route family.
- `src/controllers/v1/*.ts` is used where handlers are split from routes.
- Movie search uses `GET /v1/movies/search?title=...`.
- TV-show routes use `/v1/tv-shows`.

## Shared Contracts

- Auth role and bearer token claim types live in `src/types/auth.ts`.
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

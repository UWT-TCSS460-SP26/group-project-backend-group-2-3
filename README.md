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
- `AUTH_ISSUER=https://tcss-460-iam.onrender.com` and `API_AUDIENCE=group-2-api` for Auth² bearer token verification.
- `CORS_ALLOWED_ORIGINS` as a comma-separated list of browser origins allowed to call the API.

## Auth² Token Contract

Mutation and admin routes require an Auth² OIDC bearer token (RS256, validated against the issuer JWKS).

| Field    | Value                               |
| -------- | ----------------------------------- |
| Issuer   | `https://tcss-460-iam.onrender.com` |
| Audience | `group-2-api`                       |

Mint a token at the TCSS 460 Auth² Token Playground (the issuer URL above), then send it as
`Authorization: Bearer <token>`. Tokens whose `iss` does not match the issuer or whose `aud`
does not contain `group-2-api` are rejected with 401.

## Partner CORS Allowlist

The deployed API accepts browser preflight from these origins:

- `http://localhost:3000` — local frontend / docs
- `http://localhost:5173` — partner consumer-app dev origin (Vite default; reserved for the
  downstream team building against this API)

To add a partner's production origin, append it to `CORS_ALLOWED_ORIGINS` (comma-separated)
in the deployment environment and redeploy. The CORS middleware passes the `Authorization`
header through preflight, so the partner's first authenticated call from an allowlisted origin
is not blocked by the browser.

Verify a new origin locally:

```bash
curl -i -X OPTIONS \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Authorization' \
  http://localhost:3000/v1/movies/popular
```

The response should include `Access-Control-Allow-Origin: http://localhost:5173`.

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

## Running the Tests

The test suite needs a local PostgreSQL database. The fastest way to get one is via Docker:

```bash
# 1. Install dependencies
npm install

# 2. Start a local Postgres (Docker required — runs on port 5433)
docker compose up -d

# 3. Apply migrations and generate the Prisma client
npx prisma migrate deploy
npx prisma generate

# 4. Run the tests
npm test
```

Tests fall back to sensible defaults via `tests/setup.ts`, so a `.env` file is not required just to run them. If you already have your own Postgres running, set `DATABASE_URL` in `.env` to point at it instead of using `docker compose`.

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

Production deployment runs on Render with a hosted PostgreSQL database. The Render build command
installs dependencies, generates Prisma Client, applies committed migrations with
`npx prisma migrate deploy`, and compiles TypeScript before starting the API with `npm start`.

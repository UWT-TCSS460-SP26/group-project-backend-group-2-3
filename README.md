# TCSS 460 Group 2 Backend API

Express and TypeScript API for the Movie and TV Review Platform group project.

## Partner Handoff (Sprint 4)

### 1) Where is the API deployed?

- Base URL: `https://group-2-9289.onrender.com`
- Health check: `GET https://group-2-9289.onrender.com/health`
- OpenAPI docs UI: `https://group-2-9289.onrender.com/api-docs`
- OpenAPI JSON: `https://group-2-9289.onrender.com/openapi.json`

### 2) How do I mint an access token?

Use the TCSS 460 Auth2 Token Playground / issuer URL:

- `https://tcss-460-iam.onrender.com`

Mint an OIDC bearer token (RS256) whose audience includes:

- `group-2-api`

Token validation contract on this API:

| Field            | Value                               |
| ---------------- | ----------------------------------- |
| Issuer (`iss`)   | `https://tcss-460-iam.onrender.com` |
| Audience (`aud`) | `group-2-api`                       |

Use the token as:

- `Authorization: Bearer <token>`

Admin note for issue queue routes:

- Auth2 token role may still be User.
- Admin authorization for issue queue routes is determined from the local database user role.

### 3) What endpoints exist?

Use the OpenAPI contract as source of truth:

- `https://group-2-9289.onrender.com/api-docs`

High-use routes:

- `GET /health`
- `GET /v1/movies/search`
- `GET /v1/movies/popular`
- `GET /v1/movies/:id`
- `GET /v1/tv-shows/search`
- `GET /v1/tv-shows/popular`
- `GET /v1/tv-shows/:id`
- `GET /v1/discover/top-rated` (public)
- `POST /v1/issues` (public)
- `GET /v1/me/ratings` (auth required)
- `GET /v1/me/reviews` (auth required)
- `GET /v1/issues` (admin+)
- `PATCH /v1/issues/:id` (admin+)
- `DELETE /v1/issues/:id` (admin+)

### 4) Which browser origins are CORS-allowlisted?

Current allowlist targets local partner/frontend development:

- `http://localhost:3000` (local frontend / docs)
- `http://localhost:5173` (partner consumer-app dev origin)

To add a new production origin, append it to `CORS_ALLOWED_ORIGINS` in the deployment environment and redeploy:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://partner-app.example.com
```

The API allows the `Authorization` header in preflight, so authenticated browser calls from allowlisted origins work without extra code changes.

### 5) Where do I file bug reports?

Deployed Bug Tracker FE:

- `https://bug-tracker-g2.vercel.app`

Reports can also be submitted directly to the public bug-report API:

- `POST https://group-2-9289.onrender.com/v1/issues`

### 6) Known limits and quirks

- No app-level rate limiter is currently enforced by this API.
- TMDB-backed routes depend on TMDB availability and may degrade when TMDB is unavailable.
- `GET /v1/discover/top-rated` runs a live SQL aggregate and then fetches TMDB metadata per ranked item on the requested page.
- Discovery responses currently use a live-per-request strategy (no cache/materialized view yet).
- Missing or temporarily unavailable TMDB items are skipped rather than failing the entire discovery response.

## First Authenticated Call (Partner Quick Test)

```bash
TOKEN="<auth2-access-token-with-aud-group-2-api>"

curl -sS \
  -H "Authorization: Bearer ${TOKEN}" \
  https://group-2-9289.onrender.com/v1/me/ratings
```

Expected behavior:

- `200` with paginated JSON if token is valid.
- `401` if the token is missing, expired, or has invalid `iss`/`aud`.

## Spec Freeze Policy

From Sprint 4 onward, OpenAPI changes must ship in the same PR as route behavior changes. The partner-facing contract is `openapi.yaml` + `/api-docs`; code/spec drift is treated as a release blocker.

## Local Development Quick Start

```bash
npm install
npm run dev
```

The server uses `PORT` from the environment and defaults to `3000`.

Copy `.env.example` to `.env` and set:

- `TMDB_API_KEY` for TMDB proxy and enrichment routes.
- `DATABASE_URL` for local PostgreSQL (Docker fast path: `postgresql://postgres:password@localhost:5433/tcss460`).
- Prisma Studio v7 note: do not add `?schema=public` to this URL.
- `AUTH_ISSUER=https://tcss-460-iam.onrender.com`
- `API_AUDIENCE=group-2-api`
- `ADMIN_SUBJECT_ID` optionally promotes that Auth² `sub` to a database admin
  during deployment.
- `CORS_ALLOWED_ORIGINS` as a comma-separated allowlist.

Local docs are available at:

- `http://localhost:3000/api-docs`

## CORS Preflight Verification

```bash
curl -i -X OPTIONS \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Authorization' \
  http://localhost:3000/v1/movies/popular
```

The response should include:

- `Access-Control-Allow-Origin: http://localhost:5173`

## Database Setup (Local)

After `DATABASE_URL` is configured, apply migrations and seed:

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed is idempotent and ensures an admin account with:

- username `admin`
- email `admin@dev.local`

## Render Deployment

Use:

```bash
# Build command
npm ci --include=dev && npx prisma generate && npm run build

# Start command
npx prisma migrate deploy && npm run bootstrap:admin && npm run start
```

For a new Render database, add `ADMIN_SUBJECT_ID` to the backend service's
environment variables. Set it to the Auth² token subject for the administrator
(for example, `14`). The bootstrap is idempotent: on every deploy it promotes
that subject's existing user row to `admin`, or creates a placeholder admin row
when the database is empty. A later authenticated profile/write request keeps
using the same subject and database user.

Do not put bearer tokens in Render environment variables. Only store the stable
Auth² subject identifier.

Sprint 3 migration behavior:

- Existing Sprint 2 users are backfilled with `legacy-user-<id>` subject IDs.
- New authenticated writes map Auth2 subjects to local numeric `User.id` rows.

## Running Tests

The test suite needs PostgreSQL. Fast path with Docker:

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres on port 5433
docker compose up -d

# 3. Apply migrations and generate Prisma client
npx prisma migrate deploy
npx prisma generate

# 4. Run tests
npm test
```

Tests resolve the database URL in this order: `TEST_DATABASE_URL`, then existing `DATABASE_URL`, then the Docker default `postgresql://postgres:password@localhost:5433/tcss460`.

## Route and Controller Layout

- `src/routes/v1/index.ts` mounts active route families.
- `src/routes/v1/*.ts` defines endpoint families.
- `src/controllers/v1/*.ts` contains route handlers.
- Movie search route: `GET /v1/movies/search?title=...`.
- TV routes are under `/v1/tv-shows`.

## Sprint 4 Discovery Contract

Sprint 4 ships:

- `GET /v1/discover/top-rated`

This sprint does not add:

- `/v1/discover/most-reviewed`

Implementation strategy:

- SQL aggregate first in PostgreSQL.
- TMDB metadata fetch per ranked item on the current page.
- Missing/upstream-failing TMDB items are skipped.

## Shared Contracts

- Auth role/claim types: `src/types/auth.ts`
- API status/error constants: `src/types/api.ts`
- Standard error shape: `{ "error": "message" }`
- Error mapping middleware: `src/errors/error-mapper.ts`
- Owner checks: `assertOwner` / `assertOwnerOrAdmin` in `src/utils/authorization.ts`

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

## Deployment Notes

Production runs on Render with hosted PostgreSQL.

Build command:

- `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build`

Start command:

- `npm start`

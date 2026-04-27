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

## Route and Controller Layout

The project now follows the checkoff-style versioned structure:

- `src/routes/v1/index.ts` and `src/routes/v2/index.ts` mount each version's routes
- `src/routes/v1/*.ts` and `src/routes/v2/*.ts` define endpoints for each version
- `src/controllers/v1/*.ts` and `src/controllers/v2/*.ts` are used where handlers are split from routes

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

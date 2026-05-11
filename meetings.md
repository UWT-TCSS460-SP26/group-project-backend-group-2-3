# First Meeting Template

Notes: This meeting did not have to take place in person, but it had to be run synchronously. If the group meets via Discord Voice, Zoom, or another streaming platform, meeting with cameras on is encouraged.

## Agenda Item 1

Decide on a Meeting Manager. This person is not the group leader. The meeting manager's role is to keep the group on task during the meeting.

Meeting Manager: Collins

## Agenda Item 2

Decide on a Meeting Scribe. This person documents the meeting minutes. The group should help the scribe in their role, keep their own notes, and work slowly enough for the scribe to document the meeting.

Meeting Scribe: Rudolf

## Agenda Item 3

Get to know each group member. Each group member answered the following questions.

### What is your name or nickname, and what do you prefer to be called?

- Rudolf
- Mani
- Collins
- Jonathan

### Where did you do Freshman/Sophomore year and/or where did you take 142/143? Did your 142/143 prepare you for this course?

- Rudolf: Bellevue College (Running Start). Yes, it helped me learn how to write code, though not in TypeScript. I learned TypeScript on my own. It mainly gave me the coding basics.
- Mani: Pierce College (Running Start). Yes, it helped me learn coding basics and prepared me for the prerequisites for this course.
- Collins: UW Tacoma. Yes, it helped me understand coding in general.
- Jonathan: UW Tacoma. It helped me learn programming basics.

### What are your programming strengths and weaknesses?

Be honest. It is okay to not be a strong programmer yet. Let the group know so the group as a whole can work with you.

- Rudolf: I have experience with APIs and client/server architecture. I have built a couple of applications and I always use GitHub. I am relearning TypeScript and forgot some of the syntax.
- Collins: I am new to Node, Express, Next, TypeScript, and JavaScript, and I am also relearning VS Code.
- Mani: I know VS Code and GitHub, but I am also new to TypeScript and most of the tools we will learn in this class.
- Jonathan: I am good with Git/GitHub, but I am new to JavaScript and TypeScript.

### What other obligations take time away from your ability to work on this project?

Be honest so the group can plan around outside obligations.

- Rudolf: Work and other projects.
- Mani: Family, other projects, and other classes.
- Collins: Work three times a week and full-time classes.
- Jonathan: School and projects.

### What is something you want others to know about yourself?

- Rudolf: I do boxing and grappling. I have done boxing since I was 5 and have been doing BJJ for about a year. I was born in Armenia.
- Mani: I like working out and going on hikes. I was born in Punjab.
- Collins: I speak 4 languages, I love traveling, and I was born in Kenya.
- Jonathan: I speak 2 languages.

## Agenda Item 4

Decide on a group structure.

Questions discussed:

- Do you want to have a dedicated group leader?
- Who are the Subject Matter Experts (SMEs) for different areas such as GUI, OO, logic, management, etc.?
- Should students pair program together?
- Who will handle testing?
- Who has Git experience and/or wants to become the group's Git/GitHub SME?

Decision:

Rudolf will be the group lead and keep the tasks organized and check final merges. Every sprint, the group will have a meeting at the beginning of the week to talk about how the work will be split. From there, the group will decide what tasks each person gets and who will work with whom if needed.

## Agenda Item 5

Discuss concerns for the group project, bad experiences from past group work, what the group wants to get out of this project, and strategies for success.

Discussion:

The group agreed to communicate well. If anything comes up, members should let the group know. Everyone should get tasks done on time and keep in contact if help is needed. Members should ask anytime they need help, and if needed, hop on a call to understand a concept or resolve an issue.

## Agenda Item 6

The group needs to meet synchronously, online is okay, at least 3 times a week. The group discussed times and days that work for everyone.

When2Meet:

https://www.when2meet.com/

Meeting times:

- Sunday starting at 8:00 PM or 8:30 PM
- After-class meetings

If anyone cannot make it, the group will take notes so the person who missed the meeting knows what happened.

## Agenda Item 7

Wrap-up:

The group finished setting initial team roles, communication expectations, meeting availability, and collaboration plans for Sprint 0 and future sprints.

## Sprint 1 Planning and Execution Notes (Apr 14 - Apr 20, 2026)

### Sprint 1 ceremonies

- Sprint planning sync was held at the start of the sprint to confirm scope, route ownership, and integration order.
- Mid-sprint checkpoints were used to report progress, identify blockers early, and rebalance workload when needed.
- End-of-sprint integration review was used to confirm API behavior, tests, and documentation before sign-off.

### Sprint 1 task split (high-level)

- Rudolf owned foundation and integration-heavy scope (environment/config setup, shared client and middleware scaffolding, movie detail route implementation, movie detail tests/docs, final integration checks, and deployment smoke-test coordination).
- Collins owned movie search/popular route implementation, related tests, and corresponding API documentation updates.
- Mani owned show search/popular route implementation, related tests, and corresponding API documentation updates.
- Jonathan owned show detail implementation, detail route testing, and final API documentation consistency review.

### Timeline and dependency flow

- Early sprint: foundation work was completed first so all feature branches could build on shared config, utilities, and error handling.
- Mid sprint: movie and show endpoint implementation proceeded in parallel after foundation dependencies were in place.
- Late sprint: test coverage and endpoint documentation were completed after route behavior stabilized.
- Final sprint window: all feature outputs were integrated in sequence, followed by full local verification/readiness checks and deployment smoke-test planning as the sprint completion gate.

### Blockers, risks, and decisions

- Blocker encountered: OpenAPI merge/integration conflicts produced a malformed spec, which interrupted integration verification.
- Risk identified: inconsistent API contract behavior across branches during merge windows (especially docs vs. implementation drift).
- Team decision: keep a single OpenAPI source of truth aligned to implemented route behavior before final sign-off.
- Team decision: keep error response shape consistent as `{ "error": "..." }` across routes and tests.
- Team decision: do final integration gating with a full local test pass before closing sprint completion tasks.

## Sprint 2 Planning and Execution Notes (Apr 20 - Apr 26, 2026)

### Sprint 2 ceremonies

- Sprint planning sync was held on April 20, 2026 to confirm the Prisma persistence scope, JWT auth flow, endpoint contracts, and owner responsibilities.
- Mid-sprint checkpoints on April 22 and April 24, 2026 were used for dependency tracking, merge timing, and blocker escalation.
- Final integration review was completed during the April 25-26, 2026 release window before the Sprint 2 branch was considered ready for final merge.

### Sprint 2 task split

- Rudolf owned the cross-cutting foundation and final gate work: Prisma setup, schema/migration/seed flow, authorization helpers, shared response/test/OpenAPI components, and integration sign-off.
- Collins owned ratings create/read/list work, ratings tests, and ratings OpenAPI coverage.
- Mani owned reviews create/read/list work, reviews tests, and reviews OpenAPI coverage.
- Jonathan owned dev auth plumbing, protected mutation route behavior, owner/admin checks, mutation/auth tests, and matching OpenAPI updates.

### Timeline and dependency flow

- Foundation work landed first so endpoint branches could share the same Prisma, auth, and error-handling assumptions.
- Ratings, reviews, and mutation work proceeded in parallel after the shared model and auth contracts stabilized.
- Shared response mappers, shared test fixtures, and shared OpenAPI components were added late in the sprint to reduce contract drift between ratings and reviews.
- Final integration focused on making the branch build, lint, format-check, test, and database-seed cleanly as one Sprint 2 deliverable.

### Final release checklist

- Build: `npm run build` passed.
- Lint: `npm run lint` passed.
- Formatting: `npm run format:check` passed.
- Prisma schema: `npx prisma validate` passed.
- Migration status: `npx prisma migrate status` reported the configured local database is up to date with the two committed migrations.
- Seed: `npx prisma db seed` passed and confirmed the idempotent admin seed user.
- OpenAPI: `openapi.yaml` parsed successfully and all component `$ref`s resolved.
- Tests: `npm test` passed with 18 test suites and 146 tests passing.

### Final outcome and risks

- Go/no-go decision: go for final Sprint 2 merge.
- Sprint 2 persistence scope is complete: users, ratings, reviews, dev JWT auth, owner/admin mutation checks, OpenAPI docs, and automated tests are integrated.
- Remaining environment note: DB-backed Jest tests require `.env` to point at a reachable local PostgreSQL database. Jest now loads `.env` before tests so local runs use the configured database instead of falling back to a stale default port.
- Fresh temporary database migration reset was not run in this session; migration status and seed were verified against the configured local database, and the full DB-backed test suite passed.

## Sprint 3 Planning and Execution Notes (Apr 27 - May 3, 2026)

### Sprint 3 ceremonies

- Sprint planning sync was used to split Auth2, hosted database, public issues, community summary, enriched detail routes, tests, docs, and deployment work.
- Mid-sprint checkpoints focused on merge order because Auth2, Prisma migration work, and enriched route work affected shared files.
- Final integration review covered GitHub Actions, Render deployment, hosted PostgreSQL migrations, live public route smoke tests, and remaining release risks.

### Sprint 3 task split

- Rudolf owned shared Sprint 3 integration work, including Auth2/JWKS migration support, community summary support, CI fixes, hosted PostgreSQL deployment, Render configuration, and final integration gate.
- Collins owned public bug-report issue route work and related documentation coverage.
- Mani owned enriched movie detail work and movie community contract tests.
- Jonathan owned enriched TV-show detail work and TV-show community contract tests.

### Timeline and dependency flow

- Early sprint: v2 behavior was promoted into v1 and the old v2 surface was removed so all Sprint 3 work targeted the final v1 API.
- Mid sprint: Auth2 middleware, local user identity mapping, Prisma migration updates, public issue submission, and community summary logic landed.
- Late sprint: enriched movie and TV-show detail routes, contract tests, README/OpenAPI updates, and GitHub Actions database setup were integrated.
- Final sprint window: dev was merged into main, Render deployed main, Prisma migrations were applied against hosted Postgres, and live public endpoints were smoke tested.

### Final release checklist

- Production URL: `https://group-2-9289.onrender.com/`
- Render build command: `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build`
- Render start command: `npm start`
- Hosted PostgreSQL migration status: all three committed Prisma migrations applied successfully in production.
- Build: `npm run build` passed.
- Lint: `npm run lint` passed.
- Formatting: `npm run format:check` passed.
- Prisma schema: `npx prisma validate` passed.
- GitHub Actions: CI runs with a temporary Postgres service, Prisma Client generation, migration deployment, format check, lint, build, and tests.
- Live smoke checks: `/health` returned 200, `/openapi.json` returned Sprint 3 API version `3.0.0`, and `/v1/movies/popular` returned live TMDB data.

### Final outcome and risks

- Go/no-go decision: go for Sprint 3 turn-in after the final Auth2 token smoke test is recorded.
- Sprint 3 production scope is complete: Auth2/JWKS middleware, local Auth2 subject mapping, hosted Postgres, public issue submission, enriched movie and TV-show detail responses, OpenAPI docs, CI, and Render deployment are integrated on main.
- Remaining operational note: protected deployed routes require a real Auth2 access token for `API_AUDIENCE=group-2-api`; access tokens expire and should be refreshed from the TCSS 460 Token Playground for manual smoke tests.

## Sprint 4 Planning and Execution Notes (May 4 - May 10, 2026)

### Sprint 4 ceremonies

- Sprint planning sync split ownership for admin issues routes, `/v1/me/*` routes, discovery aggregate, author surface consistency, OpenAPI drift fixes, and partner handoff docs.
- Mid-sprint checkpoints focused on dependency order so foundational admin/CORS/OpenAPI work landed before downstream test and documentation tasks.
- Final integration review in this branch used a local-only release gate first, with deployed smoke intentionally deferred until Sprint 4 is merged to `main` and Render is updated.

### Sprint 4 task split

- Rudolf owned `S4-00`, `S4-01`, `S4-02`, `S4-09`, and `S4-10`.
- Collins owned `S4-03` and `S4-04`.
- Mani owned `S4-05` and `S4-06`.
- Jonathan owned `S4-07` and `S4-08`.

### Timeline and dependency flow

- Early sprint: admin `/v1/issues` read + triage routes and Auth2/CORS contract hardening landed first.
- Mid sprint: `/v1/me/ratings`, `/v1/me/reviews`, and `/v1/discover/top-rated` were implemented with tests and OpenAPI updates.
- Late sprint: author-surface audit, admin-route auth tests, and partner-facing README hardening were integrated.
- Final sprint window: local release gate was rerun end-to-end on `rudolfs-branch` before promotion to `main`.

### Final local release checklist

- Formatting: `npm run format:check` passed.
- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Prisma schema: `npx prisma validate` passed.
- Tests: `npm test` passed with 26 test suites and 230 tests passing.
- OpenAPI: Sprint 4 routes and Auth2 issuer/audience contract are present in `openapi.yaml`.
- README: partner-facing handoff sections were completed for Sprint 4.

### Deferred post-merge production checklist

- Render currently serves Sprint 3 (`main`), so Sprint 4 production smoke checks were intentionally deferred in this branch.
- After merging Sprint 4 to `main` and deploying Render, run smoke checks for:
- public routes (`/health`, `/v1/movies/popular`, `/v1/issues`, `/v1/discover/top-rated`);
- protected user routes with a valid user token (`/v1/me/ratings`, `/v1/me/reviews`);
- protected admin routes with a valid admin token (`GET/PATCH/DELETE /v1/issues` including invalid-status PATCH `400`);
- deployed CORS preflight from `http://localhost:5173` with `Authorization` header.

### Final outcome and risks

- Go/no-go decision for branch promotion: go for merge to `main`.
- Sprint 4 local integration scope is complete and gate-clean on `rudolfs-branch`.
- Remaining release risk: production verification is still pending until Render is updated with Sprint 4 commits and token-based smoke tests are executed on the deployed environment.

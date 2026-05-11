import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { USER_ROLES } from '../src/types/auth';
import { authHeader, createAccessToken } from './support/auth-fixtures';
import { buildRatingRecord, buildRatingResponse } from './support/user-content-fixtures';

// ---------------------------------------------------------------------------
// Prisma mock — no database connection attempted.
// ---------------------------------------------------------------------------
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    rating: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockTransaction = prisma.$transaction as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockFetch = jest.spyOn(globalThis, 'fetch');

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
const makeToken = (userId = 1) =>
  createAccessToken({ sub: userId, email: `user${userId}@test.com`, role: USER_ROLES.user });

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockRatingRow = buildRatingRecord({ tmdbId: 550, mediaType: 'movie' });
const baseRatingResponse = buildRatingResponse({ tmdbId: 550, mediaType: 'movie' });

const mockTmdbMovieJson = {
  id: 550,
  title: 'Fight Club',
  overview: 'An insomniac office worker crosses paths with a soap maker.',
  poster_path: '/poster.jpg',
  release_date: '1999-10-15',
  backdrop_path: null,
  genres: [],
  runtime: 139,
  status: 'Released',
  vote_average: 8.4,
};

const mockLocalUser = {
  id: 1,
  subjectId: 'auth2|test-user-1',
  username: 'alice',
  email: 'user1@test.com',
  firstName: null,
  lastName: null,
  role: 'user',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  jest.resetAllMocks();
  process.env.TMDB_API_KEY = 'test-api-key';

  mockUserFindUnique.mockResolvedValue(mockLocalUser);

  mockFetch.mockResolvedValue(
    new globalThis.Response(JSON.stringify(mockTmdbMovieJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/me/ratings
// ---------------------------------------------------------------------------

describe('GET /api/v1/me/ratings', () => {
  it('200 — returns enriched ratings with tmdb metadata', async () => {
    mockTransaction.mockResolvedValue([1, [mockRatingRow]]);

    const res = await request(app)
      .get('/api/v1/me/ratings')
      .set(authHeader(makeToken(1)));

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.totalResults).toBe(1);
    expect(res.body.results).toHaveLength(1);

    const item = res.body.results[0];
    expect(item).toMatchObject({
      id: baseRatingResponse.id,
      score: baseRatingResponse.score,
      mediaType: 'movie',
      author: { id: 1, username: 'alice' },
    });
    expect(item.tmdb).toMatchObject({
      title: 'Fight Club',
      year: 1999,
      overview: expect.any(String),
    });
    expect(item.tmdb.posterUrl).toContain('/poster.jpg');
  });

  it("200 — ignores ?userId=999 and returns the token caller's ratings", async () => {
    mockTransaction.mockResolvedValue([1, [mockRatingRow]]);

    const res = await request(app)
      .get('/api/v1/me/ratings?userId=999')
      .set(authHeader(makeToken(1)));

    expect(res.status).toBe(200);
    expect(res.body.results[0].author.id).toBe(1);
    expect(mockTransaction).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({})])
    );
  });

  it('200 — empty result returns correct envelope', async () => {
    mockTransaction.mockResolvedValue([0, []]);

    const res = await request(app)
      .get('/api/v1/me/ratings')
      .set(authHeader(makeToken(1)));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 0,
      totalResults: 0,
      results: [],
    });
  });

  it('200 — TMDB upstream failure returns rating with tmdb: null', async () => {
    mockTransaction.mockResolvedValue([1, [mockRatingRow]]);
    mockFetch.mockResolvedValue(
      new globalThis.Response(JSON.stringify({ status_message: 'Service unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await request(app)
      .get('/api/v1/me/ratings')
      .set(authHeader(makeToken(1)));

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].tmdb).toBeNull();
  });

  it('401 — missing auth token returns 401', async () => {
    const res = await request(app).get('/api/v1/me/ratings');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('401 — malformed token returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/me/ratings')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});

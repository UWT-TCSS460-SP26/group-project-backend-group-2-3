import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { UserRole } from '../src/types/auth';
import { createAccessToken, TEST_JWT_SECRET } from './support/auth-fixtures';
import { buildRatingRecord, buildRatingResponse } from './support/user-content-fixtures';

// ---------------------------------------------------------------------------
// Prisma mock — replaces the entire module before any import runs.
// No database connection is ever attempted.
// ---------------------------------------------------------------------------
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    rating: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockCreate = prisma.rating.create as jest.Mock;
const mockFindUnique = prisma.rating.findUnique as jest.Mock;
const mockUpdate = prisma.rating.update as jest.Mock;
const mockDelete = prisma.rating.delete as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

// ---------------------------------------------------------------------------
// JWT helper — mints tokens directly without calling dev-login
// ---------------------------------------------------------------------------
const makeToken = (userId = 1, role: UserRole = 'user') =>
  createAccessToken({ sub: userId, email: `user${userId}@test.com`, role });

beforeEach(() => {
  jest.resetAllMocks();
  process.env.TMDB_API_KEY = 'test-api-key';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockRatingRow = buildRatingRecord();
const expectedRating = buildRatingResponse();

// ---------------------------------------------------------------------------
// GET /api/v1/ratings
// ---------------------------------------------------------------------------

describe('GET /api/v1/ratings', () => {
  it('200 — returns paginated list with defaults', async () => {
    mockTransaction.mockResolvedValue([1, [mockRatingRow]]);

    const res = await request(app).get('/api/v1/ratings');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalResults: 1,
      results: [expectedRating],
    });
  });

  it('200 — returns empty results when no ratings exist', async () => {
    mockTransaction.mockResolvedValue([0, []]);

    const res = await request(app).get('/api/v1/ratings');

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
    expect(res.body.totalResults).toBe(0);
    expect(res.body.totalPages).toBe(0);
  });

  it('200 — accepts tmdbId, mediaType, and userId filters', async () => {
    mockTransaction.mockResolvedValue([1, [mockRatingRow]]);

    const res = await request(app).get('/api/v1/ratings?tmdbId=550&mediaType=movie&userId=1');

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });

  it('200 — respects custom page and pageSize', async () => {
    mockTransaction.mockResolvedValue([0, []]);

    const res = await request(app).get('/api/v1/ratings?page=2&pageSize=5');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(5);
  });

  it('400 — non-integer page returns error', async () => {
    const res = await request(app).get('/api/v1/ratings?page=abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — page 0 returns error', async () => {
    const res = await request(app).get('/api/v1/ratings?page=0');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — pageSize above 50 returns error', async () => {
    const res = await request(app).get('/api/v1/ratings?pageSize=51');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — invalid mediaType returns error', async () => {
    const res = await request(app).get('/api/v1/ratings?mediaType=film');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — invalid tmdbId returns error', async () => {
    const res = await request(app).get('/api/v1/ratings?tmdbId=0');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/ratings
// ---------------------------------------------------------------------------

describe('POST /api/v1/ratings', () => {
  it('201 — creates rating and returns transformed response', async () => {
    mockCreate.mockResolvedValue(mockRatingRow);

    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie', score: 8 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expectedRating);
  });

  it('400 — missing tmdbId returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ mediaType: 'movie', score: 8 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — tmdbId of 0 returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 0, mediaType: 'movie', score: 8 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — missing mediaType returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, score: 8 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — invalid mediaType returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'film', score: 8 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — missing score returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — score of 0 returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie', score: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — score of 11 returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie', score: 11 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — float score returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie', score: 7.5 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — string score returns error', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie', score: '8' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('401 — no Authorization header returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .send({ tmdbId: 550, mediaType: 'movie', score: 8 });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('401 — malformed token returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ tmdbId: 550, mediaType: 'movie', score: 8 });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('409 — duplicate rating returns conflict', async () => {
    // The controller catches { code: 'P2002' } via the plain-object branch
    // of isUniqueConstraintError and converts it to 409.
    mockCreate.mockRejectedValue({ code: 'P2002' });

    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ tmdbId: 550, mediaType: 'movie', score: 8 });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/ratings/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/ratings/:id', () => {
  it('200 — returns rating by id', async () => {
    mockFindUnique.mockResolvedValue(mockRatingRow);

    const res = await request(app).get('/api/v1/ratings/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expectedRating);
  });

  it('404 — rating does not exist returns 404', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/ratings/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('404 — non-integer id returns 404', async () => {
    const res = await request(app).get('/api/v1/ratings/abc');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/ratings/:id
// Controller order: auth → parse id → findUnique → assertOwner → parseScore
// The findUnique mock must be set for any test that reaches the DB call.
// ---------------------------------------------------------------------------

describe('PUT /api/v1/ratings/:id', () => {
  it('200 — owner can update score', async () => {
    const updatedRow = buildRatingRecord({ score: 9 });
    mockFindUnique.mockResolvedValue({ id: 1, userId: 1 });
    mockUpdate.mockResolvedValue(updatedRow);

    const res = await request(app)
      .put('/api/v1/ratings/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ score: 9 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(9);
    expect(res.body.author).toEqual({ id: 1, username: 'alice' });
  });

  it('400 — score above 10 returns error', async () => {
    // Ownership check passes; score validation fires after
    mockFindUnique.mockResolvedValue({ id: 1, userId: 1 });

    const res = await request(app)
      .put('/api/v1/ratings/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ score: 15 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — score of 0 returns error', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, userId: 1 });

    const res = await request(app)
      .put('/api/v1/ratings/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ score: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('401 — no Authorization header returns 401', async () => {
    const res = await request(app).put('/api/v1/ratings/1').send({ score: 9 });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('403 — non-owner cannot update rating', async () => {
    // Rating is owned by user 2; token is for user 1
    mockFindUnique.mockResolvedValue({ id: 1, userId: 2 });

    const res = await request(app)
      .put('/api/v1/ratings/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ score: 9 });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('404 — rating does not exist returns 404', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/v1/ratings/9999')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ score: 9 });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('404 — non-integer id returns 404', async () => {
    const res = await request(app)
      .put('/api/v1/ratings/abc')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ score: 9 });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/ratings/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/ratings/:id', () => {
  it('204 — owner can delete rating', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, userId: 1 });
    mockDelete.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/v1/ratings/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('401 — no Authorization header returns 401', async () => {
    const res = await request(app).delete('/api/v1/ratings/1');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('401 — malformed token returns 401', async () => {
    const res = await request(app)
      .delete('/api/v1/ratings/1')
      .set('Authorization', 'Bearer garbage');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('403 — non-owner cannot delete rating', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, userId: 2 });

    const res = await request(app)
      .delete('/api/v1/ratings/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('404 — rating does not exist returns 404', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/ratings/9999')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('404 — non-integer id returns 404', async () => {
    const res = await request(app)
      .delete('/api/v1/ratings/abc')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

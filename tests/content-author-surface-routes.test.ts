import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { USER_ROLES } from '../src/types/auth';
import { authHeader, createAccessToken } from './support/auth-fixtures';
import { buildRatingRecord, buildReviewRecord } from './support/user-content-fixtures';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    rating: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockRatingFindUnique = prisma.rating.findUnique as jest.Mock;
const mockReviewFindUnique = prisma.review.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;

const authorShape = { id: expect.any(Number), username: expect.any(String) };

const makeToken = (userId = 1) =>
  createAccessToken({ sub: userId, email: `user${userId}@test.com`, role: USER_ROLES.user });

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
});

describe('author surface across HTTP list/detail and /me routes', () => {
  it('GET /api/v1/ratings/:id includes author', async () => {
    mockRatingFindUnique.mockResolvedValue(buildRatingRecord({ id: 9 }));

    const res = await request(app).get('/api/v1/ratings/9');

    expect(res.status).toBe(200);
    expect(res.body.author).toEqual(authorShape);
    expect(String(res.body.author.username).length).toBeGreaterThan(0);
  });

  it('GET /api/v1/reviews/:id includes author', async () => {
    mockReviewFindUnique.mockResolvedValue(buildReviewRecord({ id: 201 }));

    const res = await request(app).get('/api/v1/reviews/201');

    expect(res.status).toBe(200);
    expect(res.body.author).toEqual(authorShape);
    expect(String(res.body.author.username).length).toBeGreaterThan(0);
  });

  it('GET /api/v1/ratings list results include author', async () => {
    mockTransaction.mockResolvedValueOnce([1, [buildRatingRecord({ id: 3 })]]);

    const res = await request(app).get('/api/v1/ratings?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body.results[0].author).toEqual(authorShape);
  });

  it('GET /api/v1/reviews list results include author', async () => {
    mockTransaction.mockResolvedValueOnce([1, [buildReviewRecord({ id: 401 })]]);

    const res = await request(app).get('/api/v1/reviews?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body.results[0].author).toEqual(authorShape);
  });

  it('GET /api/v1/me/ratings includes author on each result', async () => {
    mockTransaction.mockResolvedValueOnce([1, [buildRatingRecord({ tmdbId: 550 })]]);

    const mockTmdbFetchResult = {
      ok: true,
      json: async () => ({
        id: 550,
        title: 'Fight Club',
        overview: 'x',
        poster_path: '/p.jpg',
        release_date: '1999-10-15',
      }),
    };
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockTmdbFetchResult as unknown as Awaited<ReturnType<typeof globalThis.fetch>>);

    const res = await request(app).get('/api/v1/me/ratings').set(authHeader(makeToken(1)));

    expect(res.status).toBe(200);
    expect(res.body.results[0].author).toEqual(authorShape);
    (globalThis.fetch as jest.Mock).mockRestore();
  });

  it('GET /api/v1/me/reviews includes author on each result', async () => {
    mockTransaction.mockResolvedValueOnce([1, [buildReviewRecord({ id: 501 })]]);

    const res = await request(app).get('/api/v1/me/reviews').set(authHeader(makeToken(1)));

    expect(res.status).toBe(200);
    expect(res.body.results[0].author).toEqual(authorShape);
  });
});

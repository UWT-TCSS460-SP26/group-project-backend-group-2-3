process.env.DATABASE_URL ??= 'postgresql://postgres:password@localhost:5433/tcss460?schema=public';
process.env.JWT_SECRET ??= 'dev-secret';

import request from 'supertest';
import {
  buildReviewCreatePayload,
  USER_CONTENT_TEST_IDENTITIES,
  USER_CONTENT_TEST_TMDB_IDS,
} from './support/user-content-fixtures';

let app: typeof import('../src/app').app;
let prisma: typeof import('../src/lib/prisma').prisma;

const ownerIdentity = USER_CONTENT_TEST_IDENTITIES.reviewOwner;
const otherIdentity = USER_CONTENT_TEST_IDENTITIES.reviewOther;
const testTmdbIds = [...USER_CONTENT_TEST_TMDB_IDS];

let ownerToken = '';
let otherToken = '';

const cleanupTestData = async (): Promise<void> => {
  await prisma.review.deleteMany({
    where: {
      tmdbId: { in: testTmdbIds },
    },
  });

  await prisma.user.deleteMany({
    where: {
      username: { in: [ownerIdentity.username, otherIdentity.username] },
    },
  });
};

const login = async (identity: { username: string; email: string }): Promise<string> => {
  const response = await request(app).post('/auth/dev-login').send(identity);

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('token');

  return response.body.token as string;
};

describe('reviews routes', () => {
  beforeAll(async () => {
    ({ app } = await import('../src/app'));
    ({ prisma } = await import('../src/lib/prisma'));

    await cleanupTestData();
    ownerToken = await login(ownerIdentity);
    otherToken = await login(otherIdentity);
  });

  afterEach(async () => {
    await prisma.review.deleteMany({
      where: {
        tmdbId: { in: testTmdbIds },
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('creates, gets, and lists reviews using the real mapped contract', async () => {
    const createResponse = await request(app)
      .post('/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(
        buildReviewCreatePayload({
          title: '  Great watch  ',
          body: '  This movie stayed sharp, focused, and worth revisiting.  ',
        })
      );

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      tmdbId: 910001,
      mediaType: 'movie',
      title: 'Great watch',
      body: 'This movie stayed sharp, focused, and worth revisiting.',
      author: {
        username: ownerIdentity.username,
      },
    });
    expect(createResponse.body.id).toEqual(expect.any(Number));
    expect(createResponse.body.createdAt).toEqual(expect.any(String));
    expect(createResponse.body.updatedAt).toEqual(expect.any(String));

    const reviewId = createResponse.body.id as number;

    const getResponse = await request(app).get(`/reviews/${reviewId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toEqual(createResponse.body);

    await request(app)
      .post('/reviews')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(
        buildReviewCreatePayload({
          tmdbId: 910002,
          mediaType: 'show',
          title: 'Solid season',
          body: 'This season kept the pacing tight and the ending paid off well.',
        })
      )
      .expect(201);

    const listResponse = await request(app).get(
      '/reviews?tmdbId=910001&mediaType=movie&page=1&pageSize=1'
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toMatchObject({
      page: 1,
      pageSize: 1,
      totalPages: 1,
      totalResults: 1,
      results: [createResponse.body],
    });
  });

  it('returns 400 for invalid review payloads and list query params', async () => {
    const invalidCreateResponse = await request(app)
      .post('/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tmdbId: '910003',
        mediaType: 'movie',
        body: 'This body is long enough to be valid.',
      });

    expect(invalidCreateResponse.status).toBe(400);
    expect(invalidCreateResponse.body).toEqual({
      error: 'tmdbId must be a positive integer',
    });

    const shortBodyResponse = await request(app)
      .post('/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tmdbId: 910003,
        mediaType: 'movie',
        body: 'too short',
      });

    expect(shortBodyResponse.status).toBe(400);
    expect(shortBodyResponse.body).toEqual({
      error: 'body must be between 10 and 5000 characters',
    });

    const invalidMediaTypeFilterResponse = await request(app).get('/reviews?mediaType=book');

    expect(invalidMediaTypeFilterResponse.status).toBe(400);
    expect(invalidMediaTypeFilterResponse.body).toEqual({
      error: 'Query parameter mediaType must be either movie or show',
    });

    const invalidPageSizeResponse = await request(app).get('/reviews?pageSize=51');

    expect(invalidPageSizeResponse.status).toBe(400);
    expect(invalidPageSizeResponse.body).toEqual({
      error: 'Query parameter pageSize must be 50 or less',
    });
  });

  it('returns 404 when a review does not exist', async () => {
    const invalidIdResponse = await request(app).get('/reviews/not-a-number');

    expect(invalidIdResponse.status).toBe(404);
    expect(invalidIdResponse.body).toEqual({
      error: 'Review not found',
    });

    const missingReviewResponse = await request(app).get('/reviews/99999999');

    expect(missingReviewResponse.status).toBe(404);
    expect(missingReviewResponse.body).toEqual({
      error: 'Review not found',
    });
  });

  it('returns 409 when the same user reviews the same item twice', async () => {
    const payload = buildReviewCreatePayload({
      tmdbId: 910004,
      mediaType: 'movie',
      title: 'Rewatch winner',
      body: 'This one held up even better on a second viewing than the first.',
    });

    await request(app)
      .post('/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload)
      .expect(201);

    const duplicateResponse = await request(app)
      .post('/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload);

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toEqual({
      error: 'You have already reviewed this item',
    });
  });
});

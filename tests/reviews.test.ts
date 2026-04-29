process.env.DATABASE_URL ??= 'postgresql://postgres:password@localhost:5433/tcss460?schema=public';

import request from 'supertest';
import { USER_ROLES } from '../src/types/auth';
import { authHeader, createAccessToken } from './support/auth-fixtures';
import {
  buildReviewCreatePayload,
  USER_CONTENT_TEST_IDENTITIES,
  USER_CONTENT_TEST_TMDB_IDS,
} from './support/user-content-fixtures';

let app: typeof import('../src/app').app;
let prisma: typeof import('../src/lib/prisma').prisma;

jest.setTimeout(30000);

const ownerIdentity = USER_CONTENT_TEST_IDENTITIES.reviewOwner;
const otherIdentity = USER_CONTENT_TEST_IDENTITIES.reviewOther;
const adminIdentity = {
  username: 'reviews-int-admin',
  email: 'reviews-int-admin@example.test',
};
const testTmdbIds = [...USER_CONTENT_TEST_TMDB_IDS];

let ownerToken = '';
let otherToken = '';
let adminToken = '';

const cleanupTestData = async (): Promise<void> => {
  await prisma.review.deleteMany({
    where: {
      tmdbId: { in: testTmdbIds },
    },
  });

  await prisma.user.deleteMany({
    where: {
      username: { in: [ownerIdentity.username, otherIdentity.username, adminIdentity.username] },
    },
  });
};

describe('reviews routes', () => {
  beforeAll(async () => {
    ({ app } = await import('../src/app'));
    ({ prisma } = await import('../src/lib/prisma'));

    await cleanupTestData();
    const ownerUser = await prisma.user.create({
      data: {
        username: ownerIdentity.username,
        email: ownerIdentity.email,
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        username: otherIdentity.username,
        email: otherIdentity.email,
      },
    });
    const adminUser = await prisma.user.create({
      data: {
        username: adminIdentity.username,
        email: adminIdentity.email,
        role: 'admin',
      },
    });
    ownerToken = createAccessToken({
      sub: ownerUser.id,
      subjectId: 'auth2|reviews-owner',
      email: ownerUser.email,
      role: USER_ROLES.user,
    });
    otherToken = createAccessToken({
      sub: otherUser.id,
      subjectId: 'auth2|reviews-other',
      email: otherUser.email,
      role: USER_ROLES.user,
    });
    adminToken = createAccessToken({
      sub: adminUser.id,
      subjectId: 'auth2|reviews-admin',
      email: adminUser.email,
      role: USER_ROLES.admin,
    });
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
      .set(authHeader(ownerToken))
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
      .set(authHeader(otherToken))
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
      .set(authHeader(ownerToken))
      .send({
        tmdbId: '910003',
        mediaType: 'movie',
        body: 'This body is long enough to be valid.',
      });

    expect(invalidCreateResponse.status).toBe(400);
    expect(invalidCreateResponse.body).toEqual({
      error: 'tmdbId must be a positive integer',
    });

    const shortBodyResponse = await request(app).post('/reviews').set(authHeader(ownerToken)).send({
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

    await request(app).post('/reviews').set(authHeader(ownerToken)).send(payload).expect(201);

    const duplicateResponse = await request(app)
      .post('/reviews')
      .set(authHeader(ownerToken))
      .send(payload);

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body).toEqual({
      error: 'You have already reviewed this item',
    });
  });

  it('updates a review when the authenticated user owns it', async () => {
    const createResponse = await request(app)
      .post('/reviews')
      .set(authHeader(ownerToken))
      .send(
        buildReviewCreatePayload({
          tmdbId: 910005,
          title: 'Original review',
          body: 'This review has enough detail before the update happens.',
        })
      )
      .expect(201);

    const updateResponse = await request(app)
      .put(`/reviews/${createResponse.body.id}`)
      .set(authHeader(ownerToken))
      .send({
        title: 'Updated review',
        body: 'This updated review has enough detail for validation to pass.',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      tmdbId: 910005,
      title: 'Updated review',
      body: 'This updated review has enough detail for validation to pass.',
      author: {
        username: ownerIdentity.username,
      },
    });
  });

  it('rejects review updates from non-owners', async () => {
    const createResponse = await request(app)
      .post('/reviews')
      .set(authHeader(ownerToken))
      .send(
        buildReviewCreatePayload({
          tmdbId: 910005,
          title: 'Owner review',
          body: 'This review belongs to the owner and should not be changed.',
        })
      )
      .expect(201);

    const updateResponse = await request(app)
      .put(`/reviews/${createResponse.body.id}`)
      .set(authHeader(otherToken))
      .send({
        title: 'Forbidden update',
        body: 'This update should fail because the requester is not the owner.',
      });

    expect(updateResponse.status).toBe(403);
    expect(updateResponse.body).toEqual({
      error: 'You do not have permission to modify this resource',
    });
  });

  it('deletes a review when the authenticated user owns it', async () => {
    const createResponse = await request(app)
      .post('/reviews')
      .set(authHeader(ownerToken))
      .send(
        buildReviewCreatePayload({
          tmdbId: 910006,
          title: 'Delete me',
          body: 'This review should be deleted by the owner during the test.',
        })
      )
      .expect(201);

    await request(app)
      .delete(`/reviews/${createResponse.body.id}`)
      .set(authHeader(ownerToken))
      .expect(204);

    const getDeletedResponse = await request(app).get(`/reviews/${createResponse.body.id}`);

    expect(getDeletedResponse.status).toBe(404);
    expect(getDeletedResponse.body).toEqual({
      error: 'Review not found',
    });
  });

  it('allows an admin to delete a review owned by another user', async () => {
    const createResponse = await request(app)
      .post('/reviews')
      .set(authHeader(ownerToken))
      .send(
        buildReviewCreatePayload({
          tmdbId: 910006,
          title: 'Admin moderation target',
          body: 'This review should be removable by an admin account.',
        })
      )
      .expect(201);

    await request(app)
      .delete(`/reviews/${createResponse.body.id}`)
      .set(authHeader(adminToken))
      .expect(204);

    const getDeletedResponse = await request(app).get(`/reviews/${createResponse.body.id}`);

    expect(getDeletedResponse.status).toBe(404);
  });

  it('rejects review deletes from non-owner non-admin users', async () => {
    const createResponse = await request(app)
      .post('/reviews')
      .set(authHeader(ownerToken))
      .send(
        buildReviewCreatePayload({
          tmdbId: 910006,
          title: 'Protected review',
          body: 'This review should not be deleted by another regular user.',
        })
      )
      .expect(201);

    const deleteResponse = await request(app)
      .delete(`/reviews/${createResponse.body.id}`)
      .set(authHeader(otherToken));

    expect(deleteResponse.status).toBe(403);
    expect(deleteResponse.body).toEqual({
      error: 'You do not have permission to modify this resource',
    });
  });
});

import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { USER_ROLES } from '../src/types/auth';
import { authHeader, createAccessToken } from './support/auth-fixtures';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    issue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockFindUnique = prisma.issue.findUnique as jest.Mock;
const mockFindMany = prisma.issue.findMany as jest.Mock;
const mockCount = prisma.issue.count as jest.Mock;
const mockDelete = prisma.issue.delete as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

// Intentionally keep token claim at role=user; local DB role decides admin access.
const adminHeaders = authHeader(
  createAccessToken({ sub: 9001, email: 'admin@example.test', role: USER_ROLES.user })
);
const userHeaders = authHeader(
  createAccessToken({ sub: 42, email: 'user@example.test', role: USER_ROLES.user })
);

const issueRows = [
  {
    id: 1,
    title: 'Cannot login',
    description: 'Login button does nothing',
    reproductionSteps: null,
    reporterContact: null,
    status: 'open',
    createdAt: new Date('2026-05-01T10:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
  },
  {
    id: 2,
    title: 'Profile photo upload fails',
    description: '500 while uploading image',
    reproductionSteps: null,
    reporterContact: null,
    status: 'resolved',
    createdAt: new Date('2026-05-02T10:00:00.000Z'),
    updatedAt: new Date('2026-05-02T10:00:00.000Z'),
  },
  {
    id: 3,
    title: 'Notifications stale',
    description: 'Notification count does not update',
    reproductionSteps: null,
    reporterContact: null,
    status: 'open',
    createdAt: new Date('2026-05-03T10:00:00.000Z'),
    updatedAt: new Date('2026-05-03T10:00:00.000Z'),
  },
];

beforeEach(() => {
  jest.resetAllMocks();

  mockUserFindUnique.mockImplementation(({ where }: { where?: { subjectId?: string } }) => {
    if (where?.subjectId === 'auth2|test-user-9001') {
      return Promise.resolve({ id: 9001, role: 'admin' });
    }

    if (where?.subjectId === 'auth2|test-user-42') {
      return Promise.resolve({ id: 42, role: 'user' });
    }

    return Promise.resolve(null);
  });
});

describe('GET /v1/issues (admin)', () => {
  it('401 when token is missing', async () => {
    const response = await request(app).get('/v1/issues');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/missing or malformed authorization header/i);
  });

  it('401 when token is invalid', async () => {
    const response = await request(app)
      .get('/v1/issues')
      .set('Authorization', 'Bearer not-a-valid-test-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid/i);
  });

  it('403 when local user role is user', async () => {
    const response = await request(app).get('/v1/issues').set(userHeaders);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/insufficient permissions/i);
  });

  it('200 for local admin and returns pagination metadata', async () => {
    mockTransaction.mockResolvedValue([issueRows.length, issueRows]);

    const response = await request(app).get('/v1/issues').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(10);
    expect(response.body.totalResults).toBe(3);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.results).toHaveLength(3);
  });

  it('200 status filter returns only matching rows', async () => {
    mockTransaction.mockImplementation(
      async (calls: Promise<unknown>[]) => await Promise.all(calls)
    );
    mockCount.mockImplementation(({ where }) =>
      Promise.resolve(
        issueRows.filter((issue) => !where?.status || issue.status === where.status).length
      )
    );
    mockFindMany.mockImplementation(({ where }) =>
      Promise.resolve(issueRows.filter((issue) => !where?.status || issue.status === where.status))
    );

    const response = await request(app).get('/v1/issues?status=open').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body.results).toHaveLength(2);
    expect(
      response.body.results.every((issue: { status: string }) => issue.status === 'open')
    ).toBe(true);
  });

  it('200 default sort is createdAt:desc', async () => {
    mockTransaction.mockImplementation(
      async (calls: Promise<unknown>[]) => await Promise.all(calls)
    );
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const response = await request(app).get('/v1/issues').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    );
  });
});

describe('GET /v1/issues/:id (admin)', () => {
  it('401 when token is missing', async () => {
    const response = await request(app).get('/v1/issues/1');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/missing or malformed authorization header/i);
  });

  it('401 when token is invalid', async () => {
    const response = await request(app)
      .get('/v1/issues/1')
      .set('Authorization', 'Bearer not-a-valid-test-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid/i);
  });

  it('403 when local user role is user', async () => {
    const response = await request(app).get('/v1/issues/1').set(userHeaders);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/insufficient permissions/i);
  });

  it('404 with non-existent id', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await request(app).get('/v1/issues/9999').set(adminHeaders);

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/issue not found/i);
  });

  it('400 with non-integer id', async () => {
    const response = await request(app).get('/v1/issues/not-an-int').set(adminHeaders);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/issue id must be a positive integer/i);
  });

  it('200 for local admin', async () => {
    mockFindUnique.mockResolvedValue(issueRows[0]);

    const response = await request(app).get('/v1/issues/1').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 1,
      title: 'Cannot login',
      status: 'open',
    });
  });
});

describe('DELETE /v1/issues/:id (admin)', () => {
  it('401 when token is missing', async () => {
    const response = await request(app).delete('/v1/issues/1');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/missing or malformed authorization header/i);
  });

  it('401 when token is invalid', async () => {
    const response = await request(app)
      .delete('/v1/issues/1')
      .set('Authorization', 'Bearer not-a-valid-test-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid/i);
  });

  it('403 when local user role is user', async () => {
    const response = await request(app).delete('/v1/issues/1').set(userHeaders);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/insufficient permissions/i);
  });

  it('404 with non-existent id', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await request(app).delete('/v1/issues/9999').set(adminHeaders);

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/issue not found/i);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('204 success returns documented empty-body shape', async () => {
    mockFindUnique.mockResolvedValue({ id: 1 });
    mockDelete.mockResolvedValue(issueRows[0]);

    const response = await request(app).delete('/v1/issues/1').set(adminHeaders);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });
});

import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { USER_ROLES, UserRole } from '../src/types/auth';
import { authHeader, createAccessToken } from './support/auth-fixtures';

// ---------------------------------------------------------------------------
// Prisma mock — covers the public POST plus the admin GET list/detail.
// ---------------------------------------------------------------------------
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    issue: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockCreate = prisma.issue.create as jest.Mock;
const mockFindUnique = prisma.issue.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const adminToken = (userId = 1): string =>
  createAccessToken({
    sub: userId,
    email: `admin${userId}@test.com`,
    role: USER_ROLES.admin satisfies UserRole,
  });

beforeEach(() => {
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const mockIssueRow = {
  id: 1,
  title: 'App crashes on login',
  description: 'Clicking the login button causes a 500 error.',
  reproductionSteps: null,
  reporterContact: null,
  status: 'open',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

// ---------------------------------------------------------------------------
// POST /api/v1/issues
// ---------------------------------------------------------------------------

describe('POST /api/v1/issues', () => {
  it('201 — valid body persists and returns id, status, and createdAt', async () => {
    mockCreate.mockResolvedValue(mockIssueRow);

    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
      description: 'Clicking the login button causes a 500 error.',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 1,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'App crashes on login',
          description: 'Clicking the login button causes a 500 error.',
        }),
      })
    );
  });

  it('201 — optional fields are persisted when provided', async () => {
    const rowWithOptionals = {
      ...mockIssueRow,
      reproductionSteps: '1. Open app\n2. Click login',
      reporterContact: 'user@example.com',
    };
    mockCreate.mockResolvedValue(rowWithOptionals);

    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
      description: 'Clicking the login button causes a 500 error.',
      reproductionSteps: '1. Open app\n2. Click login',
      reporterContact: 'user@example.com',
    });

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reproductionSteps: '1. Open app\n2. Click login',
          reporterContact: 'user@example.com',
        }),
      })
    );
  });

  it('201 — default status is open', async () => {
    mockCreate.mockResolvedValue(mockIssueRow);

    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
      description: 'Clicking the login button causes a 500 error.',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
  });

  it('201 — trims whitespace from title and description', async () => {
    mockCreate.mockResolvedValue(mockIssueRow);

    await request(app).post('/api/v1/issues').send({
      title: '  App crashes on login  ',
      description: '  Clicking the login button causes a 500 error.  ',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'App crashes on login',
          description: 'Clicking the login button causes a 500 error.',
        }),
      })
    );
  });

  it('400 — missing title returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      description: 'Clicking the login button causes a 500 error.',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — empty title returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      title: '   ',
      description: 'Clicking the login button causes a 500 error.',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — missing description returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — empty description returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
      description: '',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — numeric title returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      title: 123,
      description: 'Clicking the login button causes a 500 error.',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — numeric description returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
      description: 456,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — numeric reproductionSteps returns error', async () => {
    const res = await request(app).post('/api/v1/issues').send({
      title: 'App crashes on login',
      description: 'Clicking the login button causes a 500 error.',
      reproductionSteps: 999,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/issues (admin)
// ---------------------------------------------------------------------------

describe('GET /api/v1/issues (admin)', () => {
  it('200 — admin token returns paginated envelope with defaults', async () => {
    mockTransaction.mockResolvedValue([1, [mockIssueRow]]);

    const res = await request(app).get('/api/v1/issues').set(authHeader(adminToken()));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalResults: 1,
      results: [
        {
          id: 1,
          title: 'App crashes on login',
          description: 'Clicking the login button causes a 500 error.',
          reproductionSteps: null,
          reporterContact: null,
          status: 'open',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('200 — empty results when no issues exist', async () => {
    mockTransaction.mockResolvedValue([0, []]);

    const res = await request(app).get('/api/v1/issues').set(authHeader(adminToken()));

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
    expect(res.body.totalResults).toBe(0);
    expect(res.body.totalPages).toBe(0);
  });

  it('200 — status filter is forwarded to prisma where clause', async () => {
    mockTransaction.mockImplementation(
      async (calls: Promise<unknown>[]) => await Promise.all(calls)
    );
    (prisma.issue.count as jest.Mock).mockResolvedValue(0);
    (prisma.issue.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/v1/issues?status=open').set(authHeader(adminToken()));

    expect(res.status).toBe(200);
    expect(prisma.issue.count).toHaveBeenCalledWith({ where: { status: 'open' } });
    expect(prisma.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'open' } })
    );
  });

  it('200 — page and pageSize are echoed and translate to skip/take', async () => {
    mockTransaction.mockImplementation(
      async (calls: Promise<unknown>[]) => await Promise.all(calls)
    );
    (prisma.issue.count as jest.Mock).mockResolvedValue(0);
    (prisma.issue.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/issues?page=2&pageSize=5')
      .set(authHeader(adminToken()));

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(5);
    expect(prisma.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 })
    );
  });

  it('200 — sort=createdAt:asc flips the order direction', async () => {
    mockTransaction.mockImplementation(
      async (calls: Promise<unknown>[]) => await Promise.all(calls)
    );
    (prisma.issue.count as jest.Mock).mockResolvedValue(0);
    (prisma.issue.findMany as jest.Mock).mockResolvedValue([]);

    await request(app).get('/api/v1/issues?sort=createdAt:asc').set(authHeader(adminToken()));

    expect(prisma.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    );
  });

  it('400 — unknown status value is rejected', async () => {
    const res = await request(app)
      .get('/api/v1/issues?status=banana')
      .set(authHeader(adminToken()));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/i);
  });

  it('400 — unknown sort value is rejected', async () => {
    const res = await request(app)
      .get('/api/v1/issues?sort=createdAt:sideways')
      .set(authHeader(adminToken()));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sort must be one of/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/issues/:id (admin)
// ---------------------------------------------------------------------------

describe('GET /api/v1/issues/:id (admin)', () => {
  it('200 — admin gets a single issue by id', async () => {
    mockFindUnique.mockResolvedValue(mockIssueRow);

    const res = await request(app).get('/api/v1/issues/1').set(authHeader(adminToken()));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 1,
      title: 'App crashes on login',
      description: 'Clicking the login button causes a 500 error.',
      reproductionSteps: null,
      reporterContact: null,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('404 — missing id returns a clear error', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/issues/9999').set(authHeader(adminToken()));

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/issue not found/i);
  });

  it('400 — non-integer id returns a clear error', async () => {
    const res = await request(app).get('/api/v1/issues/abc').set(authHeader(adminToken()));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/issue id must be a positive integer/i);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

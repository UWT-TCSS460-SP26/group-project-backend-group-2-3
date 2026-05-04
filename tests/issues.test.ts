import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ---------------------------------------------------------------------------
// Prisma mock — only the issue model is needed; no auth, no user lookup.
// ---------------------------------------------------------------------------
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    issue: {
      create: jest.fn(),
    },
  },
}));

const mockCreate = prisma.issue.create as jest.Mock;

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

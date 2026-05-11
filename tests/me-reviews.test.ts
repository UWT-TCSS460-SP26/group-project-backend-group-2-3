import { Request, Response, NextFunction } from 'express';
import { prisma } from '../src/lib/prisma';
import { listMyReviews } from '../src/controllers/v1/reviews';
import { resolveLocalUser } from '../src/services/local-user';
import { USER_ROLES } from '../src/types/auth';
import { buildReviewRecord, buildReviewResponse } from './support/user-content-fixtures';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    review: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../src/services/local-user', () => ({
  resolveLocalUser: jest.fn(),
}));

const mockReviewCount = prisma.review.count as jest.Mock;
const mockReviewFindMany = prisma.review.findMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockResolveLocalUser = resolveLocalUser as jest.MockedFunction<typeof resolveLocalUser>;

const createRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    query: {},
    user: {
      sub: 42,
      subjectId: 'auth2|test-user-42',
      email: 'reviews-int-owner@example.test',
      role: USER_ROLES.user,
    },
    ...overrides,
  }) as Request;

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return response as unknown as Response;
};

describe('listMyReviews', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockResolveLocalUser.mockResolvedValue({
      id: 42,
    } as Awaited<ReturnType<typeof resolveLocalUser>>);
  });

  it('returns the authenticated user reviews in the existing paginated contract', async () => {
    const rows = [
      buildReviewRecord({
        id: 301,
        title: 'Newest review',
        user: { id: 42, username: 'reviews-int-owner' },
      }),
      buildReviewRecord({
        id: 300,
        title: 'Older review',
        user: { id: 42, username: 'reviews-int-owner' },
      }),
    ];
    const request = createRequest({
      query: { page: '1', pageSize: '10' },
    });
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    mockTransaction.mockResolvedValue([2, rows]);

    await listMyReviews(request, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalResults: 2,
      results: [
        buildReviewResponse({
          id: 301,
          title: 'Newest review',
          user: { id: 42, username: 'reviews-int-owner' },
        }),
        buildReviewResponse({
          id: 300,
          title: 'Older review',
          user: { id: 42, username: 'reviews-int-owner' },
        }),
      ],
    });
    expect(mockResolveLocalUser).toHaveBeenCalledWith(request);
    expect(next).not.toHaveBeenCalled();
  });

  it('ignores userId in the query string and still filters by the caller sub only', async () => {
    const request = createRequest({
      query: { userId: '999', page: '1', pageSize: '10' },
    });
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    mockTransaction.mockResolvedValue([1, [buildReviewRecord({ user: { id: 42 } })]]);

    await listMyReviews(request, response, next);

    expect(mockReviewCount).toHaveBeenCalledWith({
      where: { userId: 42 },
    });
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 42 },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the request has no authenticated user', async () => {
    const request = createRequest({ user: undefined });
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    await listMyReviews(request, response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(mockResolveLocalUser).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns correct pagination math', async () => {
    const request = createRequest({
      query: { page: '2', pageSize: '2' },
    });
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    mockTransaction.mockResolvedValue([
      3,
      [
        buildReviewRecord({ id: 303, title: 'Page item A', user: { id: 42 } }),
        buildReviewRecord({ id: 302, title: 'Page item B', user: { id: 42 } }),
      ],
    ]);

    await listMyReviews(request, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 2,
        totalPages: 2,
        totalResults: 3,
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

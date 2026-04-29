import { getCommunitySummary } from '../src/services/community-summary';
import { prisma } from '../src/lib/prisma';
import { buildReviewRecord, buildReviewResponse } from './support/user-content-fixtures';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    rating: {
      aggregate: jest.fn(),
    },
    review: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockAggregate = prisma.rating.aggregate as jest.Mock;
const mockReviewCount = prisma.review.count as jest.Mock;
const mockFindMany = prisma.review.findMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

describe('getCommunitySummary', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTransaction.mockImplementation(async (queries: unknown[]) => Promise.all(queries));
  });

  it('returns stable zero-data community shape', async () => {
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: null },
      _count: { _all: 0 },
    });
    mockReviewCount.mockResolvedValueOnce(0);
    mockFindMany.mockResolvedValueOnce([]);

    await expect(getCommunitySummary(550, 'movie')).resolves.toEqual({
      averageScore: null,
      ratingCount: 0,
      reviewCount: 0,
      recentReviews: [],
    });
  });

  it('returns counts, average score, and transformed recent reviews', async () => {
    const recentReviews = [
      buildReviewRecord({
        id: 2,
        tmdbId: 550,
        mediaType: 'movie',
        createdAt: new Date('2026-04-28T10:00:00.000Z'),
        updatedAt: new Date('2026-04-28T10:00:00.000Z'),
        user: { id: 8, username: 'bob' },
      }),
      buildReviewRecord({
        id: 1,
        tmdbId: 550,
        mediaType: 'movie',
        createdAt: new Date('2026-04-27T10:00:00.000Z'),
        updatedAt: new Date('2026-04-27T10:00:00.000Z'),
        user: { id: 7, username: 'alice' },
      }),
    ];
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 8.5 },
      _count: { _all: 4 },
    });
    mockReviewCount.mockResolvedValueOnce(2);
    mockFindMany.mockResolvedValueOnce(recentReviews);

    await expect(getCommunitySummary(550, 'movie')).resolves.toEqual({
      averageScore: 8.5,
      ratingCount: 4,
      reviewCount: 2,
      recentReviews: [buildReviewResponse(recentReviews[0]), buildReviewResponse(recentReviews[1])],
    });
  });

  it('queries show community data and honors a custom recent-review limit', async () => {
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 9 },
      _count: { _all: 1 },
    });
    mockReviewCount.mockResolvedValueOnce(0);
    mockFindMany.mockResolvedValueOnce([]);

    await getCommunitySummary(1396, 'show', { recentReviewLimit: 5 });

    expect(mockAggregate).toHaveBeenCalledWith({
      where: { tmdbId: 1396, mediaType: 'show' },
      _avg: { score: true },
      _count: { _all: true },
    });
    expect(mockReviewCount).toHaveBeenCalledWith({
      where: { tmdbId: 1396, mediaType: 'show' },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tmdbId: 1396, mediaType: 'show' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
    });
  });
});

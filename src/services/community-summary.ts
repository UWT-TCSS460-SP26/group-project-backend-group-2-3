import { MediaType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  ReviewResponse,
  toReviewResponse,
  userContentAuthorInclude,
} from '../transformers/user-content';

const DEFAULT_RECENT_REVIEW_LIMIT = 3;

export interface CommunitySummary {
  averageScore: number | null;
  ratingCount: number;
  reviewCount: number;
  recentReviews: ReviewResponse[];
}

export interface CommunitySummaryOptions {
  recentReviewLimit?: number;
}

export const getCommunitySummary = async (
  tmdbId: number,
  mediaType: MediaType,
  options: CommunitySummaryOptions = {}
): Promise<CommunitySummary> => {
  const recentReviewLimit = options.recentReviewLimit ?? DEFAULT_RECENT_REVIEW_LIMIT;
  const where = { tmdbId, mediaType };

  const [ratingAggregate, reviewCount, recentReviews] = await prisma.$transaction([
    prisma.rating.aggregate({
      where,
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: userContentAuthorInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: recentReviewLimit,
    }),
  ]);

  return {
    averageScore: ratingAggregate._avg.score,
    ratingCount: ratingAggregate._count._all,
    reviewCount,
    recentReviews: recentReviews.map((review) => toReviewResponse(review)),
  };
};

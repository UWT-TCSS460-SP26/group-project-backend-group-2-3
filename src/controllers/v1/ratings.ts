import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { parseMediaTargetFilters, parsePaginationQuery } from '../../utils/request-parsing';
import { parseOptionalPositiveIntegerFilter } from '../../utils/validation';

type RatingWithAuthor = Prisma.RatingGetPayload<{
  include: { user: { select: { id: true; username: true } } };
}>;

const toRatingResponse = (rating: RatingWithAuthor) => ({
  id: rating.id,
  tmdbId: rating.tmdbId,
  mediaType: rating.mediaType,
  score: rating.score,
  createdAt: rating.createdAt.toISOString(),
  updatedAt: rating.updatedAt.toISOString(),
  author: {
    id: rating.user.id,
    username: rating.user.username,
  },
});

export const listRatings = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = parsePaginationQuery(request.query as Record<string, unknown>);
    const { tmdbId, mediaType } = parseMediaTargetFilters(request.query as Record<string, unknown>);
    const userId = parseOptionalPositiveIntegerFilter(
      request.query.userId,
      'Query parameter userId must be a positive integer'
    );

    const where: Prisma.RatingWhereInput = {
      ...(tmdbId !== undefined ? { tmdbId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(mediaType !== undefined ? { mediaType } : {}),
    };

    const [totalResults, ratings] = await prisma.$transaction([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    response.status(200).json({
      page,
      pageSize,
      totalPages: Math.ceil(totalResults / pageSize),
      totalResults,
      results: ratings.map((rating) => toRatingResponse(rating)),
    });
  } catch (error) {
    next(error);
  }
};

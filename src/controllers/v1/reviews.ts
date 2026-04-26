import { Prisma, MediaType } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import { HTTP_STATUS } from '../../types/api';
import {
  parseOptionalPositiveIntegerFilter,
  parseOptionalPositiveIntegerQueryWithDefault,
  parsePositiveIntegerPathParam,
  parseRequiredPositiveIntegerField,
} from '../../utils/validation';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

interface ReviewWithAuthor {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    username: string;
  };
}

interface ReviewBodyPayload {
  tmdbId?: unknown;
  mediaType?: unknown;
  title?: unknown;
  body?: unknown;
}

const isMediaType = (value: unknown): value is MediaType => value === 'movie' || value === 'show';

const parseMediaTypeField = (rawValue: unknown): MediaType => {
  if (!isMediaType(rawValue)) {
    throw new HttpError(400, 'mediaType must be either movie or show');
  }

  return rawValue;
};

const parseOptionalMediaTypeFilter = (rawValue: unknown): MediaType | undefined => {
  if (rawValue === undefined) {
    return undefined;
  }

  if (!isMediaType(rawValue)) {
    throw new HttpError(400, 'Query parameter mediaType must be either movie or show');
  }

  return rawValue;
};

const parseOptionalTitleField = (rawValue: unknown): string | null => {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, 'title must be a string');
  }

  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > 120) {
    throw new HttpError(400, 'title must be 120 characters or fewer');
  }

  return trimmed;
};

const parseBodyField = (rawValue: unknown): string => {
  if (typeof rawValue !== 'string') {
    throw new HttpError(400, 'body is required');
  }

  const trimmed = rawValue.trim();
  if (trimmed.length < 10 || trimmed.length > 5000) {
    throw new HttpError(400, 'body must be between 10 and 5000 characters');
  }

  return trimmed;
};

const parsePageSize = (rawValue: unknown): number => {
  const pageSize = parseOptionalPositiveIntegerQueryWithDefault(
    rawValue,
    DEFAULT_PAGE_SIZE,
    'Query parameter pageSize must be a positive integer'
  );

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, `Query parameter pageSize must be ${MAX_PAGE_SIZE} or less`);
  }

  return pageSize;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2002';
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: unknown }).code === 'P2002';
  }

  return false;
};

const toReviewResponse = (review: ReviewWithAuthor) => ({
  id: review.id,
  tmdbId: review.tmdbId,
  mediaType: review.mediaType,
  title: review.title,
  body: review.body,
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
  author: {
    id: review.user.id,
    username: review.user.username,
  },
});

export const createReview = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  try {
    const payload = request.body as ReviewBodyPayload;
    const tmdbId = parseRequiredPositiveIntegerField(payload.tmdbId, 'tmdbId must be a positive integer');
    const mediaType = parseMediaTypeField(payload.mediaType);
    const title = parseOptionalTitleField(payload.title);
    const body = parseBodyField(payload.body);

    const review = await prisma.review.create({
      data: {
        userId: request.user.sub,
        tmdbId,
        mediaType,
        title,
        body,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    response.status(201).json(toReviewResponse(review));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      next(new HttpError(HTTP_STATUS.conflict, 'You have already reviewed this item'));
      return;
    }

    next(error);
  }
};

export const getReviewById = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const reviewId = parsePositiveIntegerPathParam(request.params.id);
  if (reviewId === null) {
    next(new HttpError(HTTP_STATUS.notFound, 'Review not found'));
    return;
  }

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!review) {
      next(new HttpError(HTTP_STATUS.notFound, 'Review not found'));
      return;
    }

    response.status(200).json(toReviewResponse(review));
  } catch (error) {
    next(error);
  }
};

export const listReviews = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseOptionalPositiveIntegerQueryWithDefault(
      request.query.page,
      1,
      'Query parameter page must be a positive integer'
    );
    const pageSize = parsePageSize(request.query.pageSize);
    const tmdbId = parseOptionalPositiveIntegerFilter(
      request.query.tmdbId,
      'Query parameter tmdbId must be a positive integer'
    );
    const userId = parseOptionalPositiveIntegerFilter(
      request.query.userId,
      'Query parameter userId must be a positive integer'
    );
    const mediaType = parseOptionalMediaTypeFilter(request.query.mediaType);

    const where: Prisma.ReviewWhereInput = {
      ...(tmdbId !== undefined ? { tmdbId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(mediaType !== undefined ? { mediaType } : {}),
    };

    const [totalResults, reviews] = await prisma.$transaction([
      prisma.review.count({ where }),
      prisma.review.findMany({
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    response.status(200).json({
      page,
      pageSize,
      totalPages: Math.ceil(totalResults / pageSize),
      totalResults,
      results: reviews.map((review) => toReviewResponse(review)),
    });
  } catch (error) {
    next(error);
  }
};

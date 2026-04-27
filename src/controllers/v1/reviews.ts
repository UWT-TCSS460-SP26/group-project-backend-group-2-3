import { Prisma, MediaType } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import { HTTP_STATUS } from '../../types/api';
import { parseMediaTargetFilters, parsePaginationQuery } from '../../utils/request-parsing';
import { assertOwner, assertOwnerOrAdmin } from '../../utils/authorization';
import {
  toPaginatedResponse,
  toReviewResponse,
  userContentAuthorInclude,
} from '../../transformers/user-content';
import {
  parseOptionalPositiveIntegerFilter,
  parsePositiveIntegerPathParam,
  parseRequiredPositiveIntegerField,
} from '../../utils/validation';

interface ReviewBodyPayload {
  tmdbId?: unknown;
  mediaType?: unknown;
  title?: unknown;
  body?: unknown;
}

interface ReviewUpdatePayload {
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

const isUniqueConstraintError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2002';
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: unknown }).code === 'P2002';
  }

  return false;
};

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
    const tmdbId = parseRequiredPositiveIntegerField(
      payload.tmdbId,
      'tmdbId must be a positive integer'
    );
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
      include: userContentAuthorInclude,
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
      include: userContentAuthorInclude,
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
    const { page, pageSize, skip, take } = parsePaginationQuery(
      request.query as Record<string, unknown>
    );
    const { tmdbId, mediaType } = parseMediaTargetFilters(request.query as Record<string, unknown>);
    const userId = parseOptionalPositiveIntegerFilter(
      request.query.userId,
      'Query parameter userId must be a positive integer'
    );

    const where: Prisma.ReviewWhereInput = {
      ...(tmdbId !== undefined ? { tmdbId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(mediaType !== undefined ? { mediaType } : {}),
    };

    const [totalResults, reviews] = await prisma.$transaction([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: userContentAuthorInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    response.status(200).json(
      toPaginatedResponse({
        page,
        pageSize,
        totalResults,
        results: reviews.map((review) => toReviewResponse(review)),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  const reviewId = parsePositiveIntegerPathParam(request.params.id);
  if (reviewId === null) {
    next(new HttpError(HTTP_STATUS.notFound, 'Review not found'));
    return;
  }

  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      next(new HttpError(HTTP_STATUS.notFound, 'Review not found'));
      return;
    }

    assertOwner(request.user, existing.userId);

    const payload = request.body as ReviewUpdatePayload;
    const title = parseOptionalTitleField(payload.title);
    const body = parseBodyField(payload.body);

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { title, body },
      include: userContentAuthorInclude,
    });

    response.status(200).json(toReviewResponse(updated));
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  const reviewId = parsePositiveIntegerPathParam(request.params.id);
  if (reviewId === null) {
    next(new HttpError(HTTP_STATUS.notFound, 'Review not found'));
    return;
  }

  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      next(new HttpError(HTTP_STATUS.notFound, 'Review not found'));
      return;
    }

    assertOwnerOrAdmin(request.user, existing.userId);

    await prisma.review.delete({ where: { id: reviewId } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

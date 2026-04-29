import { MediaType, Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../errors/http-error';
import { HTTP_STATUS } from '../../types/api';
import { parseMediaTargetFilters, parsePaginationQuery } from '../../utils/request-parsing';
import { assertOwner } from '../../utils/authorization';
import {
  toPaginatedResponse,
  toRatingResponse,
  userContentAuthorInclude,
} from '../../transformers/user-content';
import {
  parseOptionalPositiveIntegerFilter,
  parsePositiveIntegerPathParam,
  parseRequiredPositiveIntegerField,
} from '../../utils/validation';

interface RatingBodyPayload {
  tmdbId?: unknown;
  mediaType?: unknown;
  score?: unknown;
}

interface RatingUpdatePayload {
  score?: unknown;
}

const isMediaType = (value: unknown): value is MediaType => value === 'movie' || value === 'show';

const parseMediaTypeField = (rawValue: unknown): MediaType => {
  if (!isMediaType(rawValue)) {
    throw new HttpError(HTTP_STATUS.badRequest, 'mediaType must be either movie or show');
  }

  return rawValue;
};

const parseScoreField = (rawValue: unknown): number => {
  if (
    typeof rawValue !== 'number' ||
    !Number.isInteger(rawValue) ||
    rawValue < 1 ||
    rawValue > 10
  ) {
    throw new HttpError(HTTP_STATUS.badRequest, 'score must be an integer between 1 and 10');
  }

  return rawValue;
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

export const createRating = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  try {
    const payload = request.body as RatingBodyPayload;
    const tmdbId = parseRequiredPositiveIntegerField(
      payload.tmdbId,
      'tmdbId must be a positive integer'
    );
    const mediaType = parseMediaTypeField(payload.mediaType);
    const score = parseScoreField(payload.score);

    const rating = await prisma.rating.create({
      data: {
        userId: request.user.sub,
        tmdbId,
        mediaType,
        score,
      },
      include: userContentAuthorInclude,
    });

    response.status(201).json(toRatingResponse(rating));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      next(new HttpError(HTTP_STATUS.conflict, 'You have already rated this item'));
      return;
    }

    next(error);
  }
};

export const getRatingById = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const ratingId = parsePositiveIntegerPathParam(request.params.id);
  if (ratingId === null) {
    next(new HttpError(HTTP_STATUS.notFound, 'Rating not found'));
    return;
  }

  try {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: userContentAuthorInclude,
    });

    if (!rating) {
      next(new HttpError(HTTP_STATUS.notFound, 'Rating not found'));
      return;
    }

    response.status(200).json(toRatingResponse(rating));
  } catch (error) {
    next(error);
  }
};

export const updateRating = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  const ratingId = parsePositiveIntegerPathParam(request.params.id);
  if (ratingId === null) {
    next(new HttpError(HTTP_STATUS.notFound, 'Rating not found'));
    return;
  }

  try {
    const existing = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      next(new HttpError(HTTP_STATUS.notFound, 'Rating not found'));
      return;
    }

    assertOwner(request.user, existing.userId);

    const payload = request.body as RatingUpdatePayload;
    const score = parseScoreField(payload.score);

    const updated = await prisma.rating.update({
      where: { id: ratingId },
      data: { score },
      include: userContentAuthorInclude,
    });

    response.status(200).json(toRatingResponse(updated));
  } catch (error) {
    next(error);
  }
};

export const deleteRating = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  const ratingId = parsePositiveIntegerPathParam(request.params.id);
  if (ratingId === null) {
    next(new HttpError(HTTP_STATUS.notFound, 'Rating not found'));
    return;
  }

  try {
    const existing = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      next(new HttpError(HTTP_STATUS.notFound, 'Rating not found'));
      return;
    }

    assertOwner(request.user, existing.userId);

    await prisma.rating.delete({ where: { id: ratingId } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const listRatings = async (
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

    const where: Prisma.RatingWhereInput = {
      ...(tmdbId !== undefined ? { tmdbId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(mediaType !== undefined ? { mediaType } : {}),
    };

    const [totalResults, ratings] = await prisma.$transaction([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
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
        results: ratings.map((rating) => toRatingResponse(rating)),
      })
    );
  } catch (error) {
    next(error);
  }
};

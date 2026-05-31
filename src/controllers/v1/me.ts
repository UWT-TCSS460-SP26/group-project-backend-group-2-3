import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { fetchTmdbMeta } from '../../services/tmdb-meta';
import { resolveLocalUser } from '../../services/local-user';
import { HttpError } from '../../errors/http-error';
import { HTTP_STATUS } from '../../types/api';
import { parsePaginationQuery } from '../../utils/request-parsing';
import {
  toPaginatedResponse,
  toRatingResponse,
  userContentAuthorInclude,
} from '../../transformers/user-content';

export const listMyRatings = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  if (!request.user) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
    return;
  }

  try {
    const localUser = await resolveLocalUser(request);
    const { page, pageSize, skip, take } = parsePaginationQuery(
      request.query as Record<string, unknown>
    );

    const [totalResults, ratings] = await prisma.$transaction([
      prisma.rating.count({ where: { userId: localUser.id } }),
      prisma.rating.findMany({
        where: { userId: localUser.id },
        include: userContentAuthorInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    const results = await Promise.all(
      ratings.map(async (rating) => ({
        ...toRatingResponse(rating),
        tmdbId: rating.tmdbId,
        tmdb: await fetchTmdbMeta(rating.tmdbId, rating.mediaType),
      }))
    );

    response.status(200).json(toPaginatedResponse({ page, pageSize, totalResults, results }));
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { getTmdbConfig } from '../../config/env';
import { tmdbClient } from '../../services/tmdb-client';
import { resolveLocalUser } from '../../services/local-user';
import { HttpError } from '../../errors/http-error';
import { HTTP_STATUS } from '../../types/api';
import { buildTmdbImageUrl } from '../../utils/tmdb-image';
import { extractYear } from '../../utils/extract-year';
import { parsePaginationQuery } from '../../utils/request-parsing';
import {
  toPaginatedResponse,
  toRatingResponse,
  userContentAuthorInclude,
} from '../../transformers/user-content';

interface TmdbMeta {
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
}

const writeWarning = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const fetchTmdbMeta = async (
  tmdbId: number,
  mediaType: 'movie' | 'show'
): Promise<TmdbMeta | null> => {
  try {
    const { imageBaseUrl } = getTmdbConfig();
    if (mediaType === 'movie') {
      const data = await tmdbClient.getMovieDetails(tmdbId);
      return {
        title: data.title,
        year: extractYear(data.release_date),
        posterUrl: buildTmdbImageUrl(imageBaseUrl, data.poster_path, 'w500'),
        overview: data.overview,
      };
    } else {
      const data = await tmdbClient.getShowDetails(tmdbId);
      return {
        title: data.name,
        year: extractYear(data.first_air_date),
        posterUrl: buildTmdbImageUrl(imageBaseUrl, data.poster_path, 'w500'),
        overview: data.overview,
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown TMDB error';
    writeWarning(`TMDB fetch failed for ${mediaType} ${tmdbId}: ${reason}`);
    return null;
  }
};

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
        tmdb: await fetchTmdbMeta(rating.tmdbId, rating.mediaType),
      }))
    );

    response.status(200).json(toPaginatedResponse({ page, pageSize, totalResults, results }));
  } catch (error) {
    next(error);
  }
};

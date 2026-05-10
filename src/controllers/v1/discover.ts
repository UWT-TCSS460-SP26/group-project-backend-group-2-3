import { MediaType, Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { getTmdbConfig } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { prisma } from '../../lib/prisma';
import { tmdbClient } from '../../services/tmdb-client';
import { toPaginatedResponse } from '../../transformers/user-content';
import {
  DiscoverFeedItem,
  DiscoverTmdbMetadata,
  TmdbMovieDetails,
  TmdbShowDetails,
} from '../../types/media';
import { HTTP_STATUS } from '../../types/api';
import { extractYear } from '../../utils/extract-year';
import { buildTmdbImageUrl } from '../../utils/tmdb-image';
import { parsePaginationQuery } from '../../utils/request-parsing';

const DEFAULT_MIN_RATINGS = 3;

interface RankedDiscoveryRow {
  tmdbId: number;
  mediaType: MediaType;
  averageScore: number;
  ratingCount: number;
}

interface RankedDiscoveryCountRow {
  totalResults: number;
}

const toDiscoverTmdbMetadata = (
  mediaType: MediaType,
  details: TmdbMovieDetails | TmdbShowDetails,
  imageBaseUrl: string
): DiscoverTmdbMetadata => {
  if (mediaType === 'movie') {
    const movie = details as TmdbMovieDetails;
    return {
      overview: movie.overview,
      posterUrl: buildTmdbImageUrl(imageBaseUrl, movie.poster_path, 'w500'),
      title: movie.title,
      year: extractYear(movie.release_date),
    };
  }

  const show = details as TmdbShowDetails;
  return {
    overview: show.overview,
    posterUrl: buildTmdbImageUrl(imageBaseUrl, show.poster_path, 'w500'),
    title: show.name,
    year: extractYear(show.first_air_date),
  };
};

const fetchTmdbMetadata = async (
  tmdbId: number,
  mediaType: MediaType,
  imageBaseUrl: string
): Promise<DiscoverTmdbMetadata | null> => {
  try {
    const details =
      mediaType === 'movie'
        ? await tmdbClient.getMovieDetails(tmdbId)
        : await tmdbClient.getShowDetails(tmdbId);

    return toDiscoverTmdbMetadata(mediaType, details, imageBaseUrl);
  } catch (error) {
    if (error instanceof HttpError) {
      if (
        error.statusCode === HTTP_STATUS.notFound ||
        error.statusCode === HTTP_STATUS.badGateway
      ) {
        console.warn(
          `[discover/top-rated] Skipping ${mediaType} ${tmdbId} because TMDB metadata was unavailable: ${error.message}`
        );
        return null;
      }
    }

    console.warn(
      `[discover/top-rated] Skipping ${mediaType} ${tmdbId} because TMDB metadata lookup failed`
    );
    return null;
  }
};

const getRankedDiscoveryRows = async (
  skip: number,
  take: number
): Promise<[RankedDiscoveryCountRow[], RankedDiscoveryRow[]]> =>
  prisma.$transaction([
    prisma.$queryRaw<RankedDiscoveryCountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "totalResults"
      FROM (
        SELECT 1
        FROM "Rating"
        GROUP BY "tmdbId", "mediaType"
        HAVING COUNT(*) >= ${DEFAULT_MIN_RATINGS}
      ) AS ranked
    `),
    prisma.$queryRaw<RankedDiscoveryRow[]>(Prisma.sql`
      SELECT
        "tmdbId",
        "mediaType",
        AVG("score")::double precision AS "averageScore",
        COUNT(*)::int AS "ratingCount"
      FROM "Rating"
      GROUP BY "tmdbId", "mediaType"
      HAVING COUNT(*) >= ${DEFAULT_MIN_RATINGS}
      ORDER BY AVG("score") DESC, COUNT(*) DESC, "tmdbId" ASC
      OFFSET ${skip}
      LIMIT ${take}
    `),
  ]);

export const listTopRatedDiscovery = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, pageSize, skip, take } = parsePaginationQuery(
      request.query as Record<string, unknown>
    );
    const { imageBaseUrl } = getTmdbConfig();
    const [countRows, rankedRows] = await getRankedDiscoveryRows(skip, take);

    const items = await Promise.all(
      rankedRows.map(async (row): Promise<DiscoverFeedItem | null> => {
        const tmdb = await fetchTmdbMetadata(row.tmdbId, row.mediaType, imageBaseUrl);
        if (!tmdb) {
          return null;
        }

        return {
          averageScore: row.averageScore,
          mediaType: row.mediaType,
          ratingCount: row.ratingCount,
          tmdb,
          tmdbId: row.tmdbId,
        };
      })
    );

    response.status(200).json(
      toPaginatedResponse({
        page,
        pageSize,
        totalResults: countRows[0]?.totalResults ?? 0,
        results: items.filter((item): item is DiscoverFeedItem => item !== null),
      })
    );
  } catch (error) {
    next(error);
  }
};

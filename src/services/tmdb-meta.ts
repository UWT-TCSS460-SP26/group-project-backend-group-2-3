import { MediaType } from '@prisma/client';
import { getTmdbConfig } from '../config/env';
import { tmdbClient } from './tmdb-client';
import { buildTmdbImageUrl } from '../utils/tmdb-image';
import { extractYear } from '../utils/extract-year';

export interface TmdbMeta {
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
}

const writeWarning = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

export const fetchTmdbMeta = async (
  tmdbId: number,
  mediaType: MediaType
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
    }

    const data = await tmdbClient.getShowDetails(tmdbId);
    return {
      title: data.name,
      year: extractYear(data.first_air_date),
      posterUrl: buildTmdbImageUrl(imageBaseUrl, data.poster_path, 'w500'),
      overview: data.overview,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown TMDB error';
    writeWarning(`TMDB fetch failed for ${mediaType} ${tmdbId}: ${reason}`);
    return null;
  }
};

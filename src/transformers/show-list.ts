import { getTmdbConfig } from '../config/env';
import { MediaListItem, TmdbShowListResult } from '../types/media';
import { extractYear } from '../utils/extract-year';
import { buildTmdbImageUrl } from '../utils/tmdb-image';
// Shared transformers for converting TMDB show list responses into API list items.

/**
 * Maps a single TMDB TV list result into the shared API media list item shape.
 * Converts `name` to `title`, extracts `year` from `first_air_date`,
 * builds a full `posterUrl`, and sets `mediaType` to `show`.
 */
export const mapTmdbShowListItem = (result: TmdbShowListResult): MediaListItem => {
  const { imageBaseUrl } = getTmdbConfig();

  return {
    id: result.id,
    title: result.name,
    year: extractYear(result.first_air_date),
    posterUrl: buildTmdbImageUrl(imageBaseUrl, result.poster_path, 'w500'),
    overview: result.overview,
    mediaType: 'show',
  };
};

/**
 * Maps an array of TMDB TV list results into shared API media list items.
 */
export const mapTmdbShowListItems = (results: TmdbShowListResult[]): MediaListItem[] => {
  return results.map(mapTmdbShowListItem);
};

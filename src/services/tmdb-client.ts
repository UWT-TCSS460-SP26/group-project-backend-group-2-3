import { getTmdbConfig } from '../config/env';
import { HttpError } from '../errors/http-error';
import {
  TmdbErrorResponse,
  TmdbListResponse,
  TmdbMovieDetails,
  TmdbMovieListResult,
  TmdbShowDetails,
  TmdbShowListResult,
} from '../types/media';

type QueryValue = boolean | number | string | null | undefined;

const buildTmdbUrl = (baseUrl: string, path: string, query: Record<string, QueryValue>): URL => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
};

const mapTmdbStatusToApiStatus = (statusCode: number): number => {
  if (statusCode === 404) {
    return 404;
  }

  return 502;
};

const readTmdbErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as TmdbErrorResponse;
    if (payload.status_message) {
      return payload.status_message;
    }
  } catch {
    // Ignore JSON parsing errors and fall back to a generic message.
  }

  return `TMDB request failed with status ${response.status}`;
};

const fetchTmdb = async <T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> => {
  const config = getTmdbConfig();
  const url = buildTmdbUrl(config.baseUrl, path, {
    ...query,
    api_key: config.apiKey,
  });

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const message = await readTmdbErrorMessage(response);
    throw new HttpError(mapTmdbStatusToApiStatus(response.status), message);
  }

  return (await response.json()) as T;
};

export const tmdbClient = {
  getMovieDetails: async (movieId: number): Promise<TmdbMovieDetails> => {
    const { defaultLanguage } = getTmdbConfig();
    return fetchTmdb<TmdbMovieDetails>(`/movie/${movieId}`, { language: defaultLanguage });
  },

  getPopularMovies: async (page = 1): Promise<TmdbListResponse<TmdbMovieListResult>> => {
    const { defaultLanguage } = getTmdbConfig();
    return fetchTmdb<TmdbListResponse<TmdbMovieListResult>>('/movie/popular', {
      language: defaultLanguage,
      page,
    });
  },

  getPopularShows: async (page = 1): Promise<TmdbListResponse<TmdbShowListResult>> => {
    const { defaultLanguage } = getTmdbConfig();
    return fetchTmdb<TmdbListResponse<TmdbShowListResult>>('/tv/popular', {
      language: defaultLanguage,
      page,
    });
  },

  getShowDetails: async (showId: number): Promise<TmdbShowDetails> => {
    const { defaultLanguage } = getTmdbConfig();
    return fetchTmdb<TmdbShowDetails>(`/tv/${showId}`, { language: defaultLanguage });
  },

  searchMovies: async (
    searchQuery: string,
    page = 1
  ): Promise<TmdbListResponse<TmdbMovieListResult>> => {
    const { defaultLanguage } = getTmdbConfig();
    return fetchTmdb<TmdbListResponse<TmdbMovieListResult>>('/search/movie', {
      language: defaultLanguage,
      page,
      query: searchQuery,
    });
  },

  searchShows: async (
    searchQuery: string,
    page = 1
  ): Promise<TmdbListResponse<TmdbShowListResult>> => {
    const { defaultLanguage } = getTmdbConfig();
    return fetchTmdb<TmdbListResponse<TmdbShowListResult>>('/search/tv', {
      language: defaultLanguage,
      page,
      query: searchQuery,
    });
  },
};

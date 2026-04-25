import { Request, Response, NextFunction } from 'express';
import { getTmdbConfig } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { tmdbClient } from '../../services/tmdb-client';
import { extractYear } from '../../utils/extract-year';
import { buildTmdbImageUrl } from '../../utils/tmdb-image';
import {
  MediaListItem,
  MediaListResponse,
  MovieDetailResponse,
  TmdbListResponse,
  TmdbMovieDetails,
  TmdbMovieListResult,
} from '../../types/media';
import {
  parseOptionalPositiveIntegerQuery,
  parsePositiveIntegerPathParam,
  parseRequiredQueryString,
} from '../../utils/validation';

export const toMovieListItem = (
  raw: TmdbMovieListResult,
  imageBaseUrl: string
): MediaListItem => ({
  id: raw.id,
  mediaType: 'movie',
  overview: raw.overview,
  posterUrl: buildTmdbImageUrl(imageBaseUrl, raw.poster_path, 'w500'),
  title: raw.title,
  year: extractYear(raw.release_date),
});

export const toMovieListResponse = (
  raw: TmdbListResponse<TmdbMovieListResult>,
  imageBaseUrl: string
): MediaListResponse => ({
  page: raw.page,
  results: raw.results.map((item) => toMovieListItem(item, imageBaseUrl)),
  totalPages: raw.total_pages,
  totalResults: raw.total_results,
});

export const toMovieDetailResponse = (
  raw: TmdbMovieDetails,
  imageBaseUrl: string
): MovieDetailResponse => ({
  backdropUrl: buildTmdbImageUrl(imageBaseUrl, raw.backdrop_path, 'w780'),
  genres: raw.genres.map((genre) => genre.name),
  id: raw.id,
  overview: raw.overview,
  posterUrl: buildTmdbImageUrl(imageBaseUrl, raw.poster_path, 'w500'),
  rating: raw.vote_average,
  runtimeMinutes: raw.runtime ?? null,
  status: raw.status,
  title: raw.title,
  year: extractYear(raw.release_date),
});

export const searchMovies = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const title = parseRequiredQueryString(
      request.query.title,
      'Query parameter title is required'
    );
    const page = parseOptionalPositiveIntegerQuery(
      request.query.page,
      'Query parameter page must be a positive integer'
    );
    const { imageBaseUrl } = getTmdbConfig();
    const data = await tmdbClient.searchMovies(title, page);
    response.json(toMovieListResponse(data, imageBaseUrl));
  } catch (error) {
    next(error);
  }
};

export const getPopularMovies = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseOptionalPositiveIntegerQuery(
      request.query.page,
      'Query parameter page must be a positive integer'
    );
    const { imageBaseUrl } = getTmdbConfig();
    const data = await tmdbClient.getPopularMovies(page);
    response.json(toMovieListResponse(data, imageBaseUrl));
  } catch (error) {
    next(error);
  }
};

export const getMovieDetails = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const movieId = parsePositiveIntegerPathParam(request.params.id);
  if (movieId === null) {
    next(new HttpError(404, 'Movie not found'));
    return;
  }

  try {
    const { imageBaseUrl } = getTmdbConfig();
    const movie = await tmdbClient.getMovieDetails(movieId);
    response.status(200).json(toMovieDetailResponse(movie, imageBaseUrl));
  } catch (error) {
    next(error);
  }
};

import { Router, Request, Response, NextFunction } from 'express';
import { getTmdbConfig } from '../config/env';
import { HttpError } from '../errors/http-error';
import { tmdbClient } from '../services/tmdb-client';
import { MovieDetailResponse, TmdbMovieDetails } from '../types/media';
import { extractYear } from '../utils/extract-year';
import { buildTmdbImageUrl } from '../utils/tmdb-image';

const router = Router();

const parsePositiveInteger = (rawValue: string): number | null => {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== rawValue) {
    return null;
  }

  return parsed;
};

const mapMovieDetails = (movie: TmdbMovieDetails): MovieDetailResponse => {
  const { imageBaseUrl } = getTmdbConfig();

  return {
    backdropUrl: buildTmdbImageUrl(imageBaseUrl, movie.backdrop_path, 'w780'),
    genres: movie.genres.map((genre) => genre.name),
    id: movie.id,
    overview: movie.overview,
    posterUrl: buildTmdbImageUrl(imageBaseUrl, movie.poster_path, 'w500'),
    rating: movie.vote_average,
    runtimeMinutes: movie.runtime ?? null,
    status: movie.status,
    title: movie.title,
    year: extractYear(movie.release_date),
  };
};

// GET /movies/search?q={title}&page={number}
router.get('/search', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

// GET /movies/popular?page={number}
router.get('/popular', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

// GET /movies/:id
router.get('/:id', async (request: Request, response: Response, next: NextFunction) => {
  const rawMovieId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const movieId = rawMovieId ? parsePositiveInteger(rawMovieId) : null;
  if (movieId === null) {
    next(new HttpError(404, 'Movie not found'));
    return;
  }

  try {
    const tmdbMovie = await tmdbClient.getMovieDetails(movieId);
    response.status(200).json(mapMovieDetails(tmdbMovie));
  } catch (error) {
    next(error);
  }
});

export { router as moviesRouter };

import { Router, Request, Response, NextFunction } from 'express';
import { getTmdbConfig } from '../config/env';
import { HttpError } from '../errors/http-error';
import { getPopularMovies, searchMovies } from '../controllers/movies';
import { tmdbClient } from '../services/tmdb-client';
import { MovieDetailResponse, TmdbMovieDetails } from '../types/media';
import { extractYear } from '../utils/extract-year';
import { buildTmdbImageUrl } from '../utils/tmdb-image';
import { parsePositiveIntegerPathParam } from '../utils/validation';

const router = Router();

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
router.get('/search', searchMovies);

// GET /movies/popular?page={number}
router.get('/popular', getPopularMovies);

// GET /movies/:id
router.get('/:id', async (request: Request, response: Response, next: NextFunction) => {
  const movieId = parsePositiveIntegerPathParam(request.params.id);
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

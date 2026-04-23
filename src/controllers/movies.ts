import { Request, Response, NextFunction } from 'express';
import { getTmdbConfig } from '../config/env';
import { HttpError } from '../errors/http-error';
import { tmdbClient } from '../services/tmdb-client';
// Pull in the helper that turns "1999-10-15" into the number 1999 (or null if missing)
import { extractYear } from '../utils/extract-year';
// Pull in the helper that builds a full image URL from a raw TMDB path like "/abc.jpg"
import { buildTmdbImageUrl } from '../utils/tmdb-image';
// MediaListItem = the shape of one item in your API's response
// MediaListResponse = the shape of the full paginated response your API returns
// TmdbListResponse = the shape of the raw paginated response TMDB sends back
// TmdbMovieListResult = the shape of one raw movie item TMDB sends back
import {
  MediaListItem,
  MediaListResponse,
  MovieDetailResponse,
  TmdbListResponse,
  TmdbMovieDetails,
  TmdbMovieListResult,
} from '../types/media';
import { parsePositiveIntegerPathParam } from '../utils/validation';

// Takes one raw TMDB movie object and one base URL string, returns one clean MediaListItem
export const toMovieListItem = (
  raw: TmdbMovieListResult, // the raw TMDB object e.g. { id, title, poster_path, release_date, overview }
  imageBaseUrl: string // e.g. "https://image.tmdb.org/t/p" — passed in so this stays a pure function
): MediaListItem => ({
  id: raw.id, // TMDB id stays as-is, just copied directly
  mediaType: 'movie', // hardcoded — this transformer is only ever called for movies, never shows
  overview: raw.overview, // TMDB overview stays as-is, just copied directly
  // buildTmdbImageUrl combines imageBaseUrl + "w500" + raw.poster_path into a full URL
  // returns null if poster_path is null (some movies have no poster)
  posterUrl: buildTmdbImageUrl(imageBaseUrl, raw.poster_path, 'w500'),
  title: raw.title, // TMDB title stays as-is, just copied directly
  // extractYear slices the first 4 characters of "1999-10-15" and parses to integer 1999
  // returns null if release_date is missing or not a valid date string
  year: extractYear(raw.release_date),
});

// Takes the full raw TMDB paginated response and returns your API's paginated response shape
export const toMovieListResponse = (
  raw: TmdbListResponse<TmdbMovieListResult>, // the full TMDB response with page, results[], total_pages, total_results
  imageBaseUrl: string // passed through to toMovieListItem for each result
): MediaListResponse => ({
  page: raw.page, // current page number, same field name so just copied
  // raw.results is an array of TMDB movie objects — map each one through toMovieListItem
  // this is where all the field renaming and URL building happens for every item
  results: raw.results.map((item) => toMovieListItem(item, imageBaseUrl)),
  totalPages: raw.total_pages, // TMDB uses snake_case — your API uses camelCase, renamed here
  totalResults: raw.total_results, // same rename: total_results → totalResults
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const q = req.query.q;
  if (!q || typeof q !== 'string') {
    next(new HttpError(400, 'Query parameter q is required'));
    return;
  }

  const page = req.query.page !== undefined ? Number(req.query.page) : 1;
  if (!Number.isInteger(page) || page < 1) {
    next(new HttpError(400, 'Query parameter page must be a positive integer'));
    return;
  }

  try {
    const { imageBaseUrl } = getTmdbConfig();
    const data = await tmdbClient.searchMovies(q, page);
    res.json(toMovieListResponse(data, imageBaseUrl));
  } catch (error) {
    next(error);
  }
};

// Handles GET /movies/popular?page={number}
export const getPopularMovies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // default to page 1 if not provided
  const page = req.query.page !== undefined ? Number(req.query.page) : 1;
  if (!Number.isInteger(page) || page < 1) {
    next(new HttpError(400, 'Query parameter page must be a positive integer'));
    return;
  }

  try {
    const { imageBaseUrl } = getTmdbConfig();
    const data = await tmdbClient.getPopularMovies(page); // calls TMDB /movie/popular
    res.json(toMovieListResponse(data, imageBaseUrl)); // same transformer as search
  } catch (error) {
    next(error); // HttpError flows to errorHandler
  }
};

export const getMovieDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const movieId = parsePositiveIntegerPathParam(req.params.id);
  if (movieId === null) {
    next(new HttpError(404, 'Movie not found'));
    return;
  }

  try {
    const { imageBaseUrl } = getTmdbConfig();
    const movie = await tmdbClient.getMovieDetails(movieId);
    res.status(200).json(toMovieDetailResponse(movie, imageBaseUrl));
  } catch (error) {
    next(error);
  }
};

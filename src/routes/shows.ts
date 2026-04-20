import { Router, Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';
import { tmdbClient } from '../services/tmdb-client';
import { mapTmdbShowDetailsToShowDetail } from '../utils/map-tmdb-show-details';

import { mapTmdbShowListItems } from '../transformers/show-list';
const router = Router();

const parsePositiveInteger = (rawValue: string): number | null => {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== rawValue) {
    return null;
  }

  return parsed;
};

// GET /shows/search?q={title}&page={number}
router.get('/search', async (request: Request, response: Response, next: NextFunction) => {
  try {
    const rawQuery = request.query.q;
    const queryValue = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;

    if (typeof queryValue !== 'string' || queryValue.trim() === '') {
      throw new HttpError(400, 'q is required');
    }

    const searchQuery = queryValue.trim();

    const rawPage = request.query.page;
    const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;

    if (pageValue !== undefined && typeof pageValue !== 'string') {
      throw new HttpError(400, 'page must be a positive integer');
    }

    const page = pageValue === undefined ? 1 : Number.parseInt(pageValue, 10);

    if (
      pageValue !== undefined &&
      (!Number.isInteger(page) || page < 1 || String(page) !== pageValue)
    ) {
      throw new HttpError(400, 'page must be a positive integer');
    }

    const tmdbResponse = await tmdbClient.searchShows(searchQuery, page);

    response.json({
      page: tmdbResponse.page,
      totalPages: tmdbResponse.total_pages,
      totalResults: tmdbResponse.total_results,
      results: mapTmdbShowListItems(tmdbResponse.results),
    });
  } catch (error) {
    next(error);
  }
});

// GET /shows/popular?page={number}
router.get('/popular', async (request: Request, response: Response, next: NextFunction) => {
  try {
    const rawPage = request.query.page;
    const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;

    if (pageValue !== undefined && typeof pageValue !== 'string') {
      throw new HttpError(400, 'page must be a positive integer');
    }

    const page = pageValue === undefined ? 1 : Number.parseInt(pageValue, 10);

    if (
      pageValue !== undefined &&
      (!Number.isInteger(page) || page < 1 || String(page) !== pageValue)
    ) {
      throw new HttpError(400, 'page must be a positive integer');
    }

    const tmdbResponse = await tmdbClient.getPopularShows(page);

    response.json({
      page: tmdbResponse.page,
      totalPages: tmdbResponse.total_pages,
      totalResults: tmdbResponse.total_results,
      results: mapTmdbShowListItems(tmdbResponse.results),
    });
  } catch (error) {
    next(error);
  }
});

// GET /shows/:id
router.get('/:id', async (request: Request, response: Response, next: NextFunction) => {
  const rawShowId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const showId = rawShowId ? parsePositiveInteger(rawShowId) : null;
  if (showId === null) {
    next(new HttpError(404, 'Show not found'));
    return;
  }

  try {
    const tmdbShow = await tmdbClient.getShowDetails(showId);
    response.status(200).json(mapTmdbShowDetailsToShowDetail(tmdbShow));
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }
    next(new HttpError(502, 'TMDB request failed'));
  }
});

export { router as showsRouter };

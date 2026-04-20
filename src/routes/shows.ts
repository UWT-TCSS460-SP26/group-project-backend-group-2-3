import { Router, Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';
import { tmdbClient } from '../services/tmdb-client';
import { mapTmdbShowDetailsToShowDetail } from '../utils/map-tmdb-show-details';

const router = Router();

const parsePositiveInteger = (rawValue: string): number | null => {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== rawValue) {
    return null;
  }

  return parsed;
};

// GET /shows/search?q={title}&page={number}
router.get('/search', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

// GET /shows/popular?page={number}
router.get('/popular', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
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

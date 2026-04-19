import { Router, Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';
import { tmdbClient } from '../services/tmdb-client';
import { mapTmdbShowListItems } from '../transformers/show-list';
const router = Router();

// GET /shows/search?q={title}&page={number}
router.get('/search', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
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

    if (!Number.isInteger(page) || page < 1 || String(page) !== pageValue) {
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
router.get('/:id', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

export { router as showsRouter };

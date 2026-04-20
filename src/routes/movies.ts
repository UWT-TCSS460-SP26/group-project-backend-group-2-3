import { Router, Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';
import { getPopularMovies, searchMovies } from '../controllers/movies';

const router = Router();

// GET /movies/search?q={title}&page={number}
router.get('/search', searchMovies);

// GET /movies/popular?page={number}
router.get('/popular', getPopularMovies);

// GET /movies/:id
router.get('/:id', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

export { router as moviesRouter };

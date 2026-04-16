import { Router, Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';

const router = Router();

// GET /shows/search?q={title}&page={number}
router.get('/search', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

// GET /shows/popular?page={number}
router.get('/popular', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

// GET /shows/:id
router.get('/:id', (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(501, 'Not Implemented'));
});

export { router as showsRouter };

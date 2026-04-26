import { Router } from 'express';
import { moviesRouter } from './movies';
import { reviewsRouter } from './reviews';
import { showsRouter } from './shows';

const router = Router();

router.use('/movies', moviesRouter);
router.use('/shows', showsRouter);
router.use('/reviews', reviewsRouter);

export { router as v1Router };

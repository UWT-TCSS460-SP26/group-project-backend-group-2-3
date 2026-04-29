import { Router } from 'express';
import { moviesRouter } from './movies';
import { ratingsRouter } from './ratings';
import { reviewsRouter } from './reviews';
import { showsRouter } from './shows';

const router = Router();

router.use('/movies', moviesRouter);
router.use('/shows', showsRouter);
router.use('/reviews', reviewsRouter);
router.use('/ratings', ratingsRouter);

export { router as v1Router };

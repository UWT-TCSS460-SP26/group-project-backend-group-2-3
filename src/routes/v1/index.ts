import { Router } from 'express';
import { issuesRouter } from './issues';
import { moviesRouter } from './movies';
import { ratingsRouter } from './ratings';
import { reviewsRouter } from './reviews';
import { tvShowsRouter } from './tv-shows';

const router = Router();

router.use('/issues', issuesRouter);
router.use('/movies', moviesRouter);
router.use('/tv-shows', tvShowsRouter);
router.use('/reviews', reviewsRouter);
router.use('/ratings', ratingsRouter);

export { router as v1Router };

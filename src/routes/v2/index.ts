import { Router } from 'express';
import { moviesRouter } from './movies';
import { tvShowsRouter } from './tv-shows';

const router = Router();

router.use('/movies', moviesRouter);
router.use('/tv-shows', tvShowsRouter);

export { router as v2Router };

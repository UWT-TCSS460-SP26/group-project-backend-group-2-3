import { Router } from 'express';
import { moviesRouter } from './movies';
import { showsRouter } from './shows';

const router = Router();

router.use('/movies', moviesRouter);
router.use('/shows', showsRouter);

export { router as v2Router };

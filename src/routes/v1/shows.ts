import { Router } from 'express';
import { popularShows, searchShows, showDetails } from '../../controllers/v1/shows';

const router = Router();

router.get('/search', searchShows);
router.get('/popular', popularShows);

router.get('/:id', showDetails);

export { router as showsRouter };

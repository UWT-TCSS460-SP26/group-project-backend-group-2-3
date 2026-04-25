import { Router } from 'express';
import { getPopularShows, getShowDetails, searchShows } from '../../controllers/v1/shows';

const router = Router();

router.get('/search', searchShows);
router.get('/popular', getPopularShows);
router.get('/:id', getShowDetails);

export { router as showsRouter };

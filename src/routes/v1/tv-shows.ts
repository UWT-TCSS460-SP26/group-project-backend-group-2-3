import { Router } from 'express';
import { getPopularTvShows, searchTvShows, tvShowDetails } from '../../controllers/v1/tv-shows';

const router = Router();

router.get('/search', searchTvShows);
router.get('/popular', getPopularTvShows);
router.get('/:id', tvShowDetails);

export { router as tvShowsRouter };

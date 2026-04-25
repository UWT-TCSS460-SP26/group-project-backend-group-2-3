import { Router } from 'express';
import { getPopularTvShows, searchTvShows } from '../../controllers/v2/tv-shows';

const router = Router();

router.get('/search', searchTvShows);
router.get('/popular', getPopularTvShows);

export { router as tvShowsRouter };

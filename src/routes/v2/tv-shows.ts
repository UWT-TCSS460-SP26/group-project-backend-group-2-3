import { Router } from 'express';
import {
  popularTvShows,
  searchTvShows,
  tvShowDetails,
} from '../../controllers/v2/tv-shows';

const router = Router();

router.get('/search', searchTvShows);
router.get('/popular', popularTvShows);

router.get('/:id', tvShowDetails);

export { router as tvShowsRouter };

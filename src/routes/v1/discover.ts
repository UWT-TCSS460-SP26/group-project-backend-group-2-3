import { Router } from 'express';
import { listTopRatedDiscovery } from '../../controllers/v1/discover';

const router = Router();

router.get('/top-rated', listTopRatedDiscovery);

export { router as discoverRouter };

import { Router } from 'express';
import { listRatings } from '../../controllers/v1/ratings';

const router = Router();

router.get('/', listRatings);

export { router as ratingsRouter };


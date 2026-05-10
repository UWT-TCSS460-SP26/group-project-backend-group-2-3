import { Router } from 'express';
import { listMyReviews } from '../../controllers/v1/reviews';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/reviews', requireAuth, listMyReviews);

export { router as meRouter };

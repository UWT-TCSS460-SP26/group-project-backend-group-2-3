import { Router } from 'express';
import { listMyRatings } from '../../controllers/v1/me';
import { listMyReviews } from '../../controllers/v1/reviews';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/ratings', requireAuth, listMyRatings);
router.get('/reviews', requireAuth, listMyReviews);

export { router as meRouter };

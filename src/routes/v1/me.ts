import { Router } from 'express';
import { listMyRatings } from '../../controllers/v1/me';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/ratings', requireAuth, listMyRatings);

export { router as meRouter };

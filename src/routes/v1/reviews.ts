import { Router } from 'express';
import { createReview, getReviewById, listReviews } from '../../controllers/v1/reviews';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/', listReviews);
router.post('/', requireAuth, createReview);
router.get('/:id', getReviewById);

export { router as reviewsRouter };

import { Router } from 'express';
import {
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  updateReview,
} from '../../controllers/v1/reviews';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/', listReviews);
router.post('/', requireAuth, createReview);
router.get('/:id', getReviewById);
router.put('/:id', requireAuth, updateReview);
router.delete('/:id', requireAuth, deleteReview);

export { router as reviewsRouter };

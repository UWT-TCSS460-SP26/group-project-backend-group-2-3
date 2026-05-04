import { Router } from 'express';
import {
  createRating,
  deleteRating,
  getRatingById,
  listRatings,
  updateRating,
} from '../../controllers/v1/ratings';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/', listRatings);
router.post('/', requireAuth, createRating);
router.get('/:id', getRatingById);
router.put('/:id', requireAuth, updateRating);
router.delete('/:id', requireAuth, deleteRating);

export { router as ratingsRouter };

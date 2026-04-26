import { Router } from 'express';
import { createRating, getRatingById, listRatings } from '../../controllers/v1/ratings';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/', listRatings);
router.post('/', requireAuth, createRating);
router.get('/:id', getRatingById);

export { router as ratingsRouter };

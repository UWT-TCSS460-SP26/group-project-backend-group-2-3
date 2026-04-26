import { Router } from 'express';
import { getMovieDetails, getPopularMovies, searchMovies } from '../../controllers/v2/movies';

const router = Router();

router.get('/search', searchMovies);
router.get('/popular', getPopularMovies);
router.get('/:id', getMovieDetails);

export { router as moviesRouter };

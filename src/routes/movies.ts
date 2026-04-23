import { Router } from 'express';
import { getMovieDetails, getPopularMovies, searchMovies } from '../controllers/movies';

const router = Router();

// GET /movies/search?q={title}&page={number}
router.get('/search', searchMovies);

// GET /movies/popular?page={number}
router.get('/popular', getPopularMovies);

// GET /movies/:id
router.get('/:id', getMovieDetails);

export { router as moviesRouter };

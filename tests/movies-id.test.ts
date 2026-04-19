import request from 'supertest';
import { app } from '../src/app';
import { HttpError } from '../src/errors/http-error';
import { tmdbClient } from '../src/services/tmdb-client';

describe('Movie Detail Route', () => {
  const originalTmdbApiKey = process.env.TMDB_API_KEY;

  beforeAll(() => {
    process.env.TMDB_API_KEY = process.env.TMDB_API_KEY ?? 'test-tmdb-api-key';
  });

  afterAll(() => {
    if (originalTmdbApiKey === undefined) {
      delete process.env.TMDB_API_KEY;
      return;
    }

    process.env.TMDB_API_KEY = originalTmdbApiKey;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /movies/:id — returns movie details (200)', async () => {
    const getMovieDetailsSpy = jest.spyOn(tmdbClient, 'getMovieDetails').mockResolvedValue({
      backdrop_path: '/backdrop.jpg',
      genres: [{ id: 18, name: 'Drama' }],
      id: 550,
      overview: 'An insomniac office worker crosses paths with a soap maker.',
      poster_path: '/poster.jpg',
      release_date: '1999-10-15',
      runtime: 139,
      status: 'Released',
      title: 'Fight Club',
      vote_average: 8.4,
    });

    const response = await request(app).get('/movies/550');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
      genres: ['Drama'],
      id: 550,
      overview: 'An insomniac office worker crosses paths with a soap maker.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      rating: 8.4,
      runtimeMinutes: 139,
      status: 'Released',
      title: 'Fight Club',
      year: 1999,
    });
    expect(getMovieDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getMovieDetailsSpy).toHaveBeenCalledWith(550);
  });

  it('GET /movies/:id — returns 404 for TMDB not found', async () => {
    const getMovieDetailsSpy = jest
      .spyOn(tmdbClient, 'getMovieDetails')
      .mockRejectedValue(new HttpError(404, 'The resource you requested could not be found.'));

    const response = await request(app).get('/movies/999999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'The resource you requested could not be found.',
    });
    expect(getMovieDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getMovieDetailsSpy).toHaveBeenCalledWith(999999);
  });

  it('GET /movies/:id — returns 502 for TMDB upstream failures', async () => {
    const getMovieDetailsSpy = jest
      .spyOn(tmdbClient, 'getMovieDetails')
      .mockRejectedValue(new HttpError(502, 'TMDB request failed with status 500'));

    const response = await request(app).get('/movies/550');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'TMDB request failed with status 500',
    });
    expect(getMovieDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getMovieDetailsSpy).toHaveBeenCalledWith(550);
  });

  it('GET /movies/:id — returns 404 for invalid id and does not call TMDB', async () => {
    const getMovieDetailsSpy = jest.spyOn(tmdbClient, 'getMovieDetails');
    const response = await request(app).get('/movies/abc');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Movie not found',
    });
    expect(getMovieDetailsSpy).not.toHaveBeenCalled();
  });
});

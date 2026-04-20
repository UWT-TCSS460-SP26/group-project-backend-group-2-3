import request from 'supertest';
import { app } from '../src/app';
import { HttpError } from '../src/errors/http-error';
import { tmdbClient } from '../src/services/tmdb-client';

describe('Show Detail Route', () => {
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

  it('GET /shows/:id — returns show details (200)', async () => {
    const getShowDetailsSpy = jest.spyOn(tmdbClient, 'getShowDetails').mockResolvedValue({
      backdrop_path: '/backdrop.jpg',
      first_air_date: '2008-01-20',
      genres: [{ id: 18, name: 'Drama' }],
      id: 1396,
      name: 'Breaking Bad',
      number_of_episodes: 62,
      number_of_seasons: 5,
      overview: 'A high school chemistry teacher turned methamphetamine manufacturer.',
      poster_path: '/poster.jpg',
      status: 'Ended',
      vote_average: 8.9,
    });

    const response = await request(app).get('/shows/1396');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
      episodeCount: 62,
      genres: ['Drama'],
      id: 1396,
      overview: 'A high school chemistry teacher turned methamphetamine manufacturer.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      rating: 8.9,
      seasonCount: 5,
      status: 'Ended',
      title: 'Breaking Bad',
      year: 2008,
    });
    expect(getShowDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getShowDetailsSpy).toHaveBeenCalledWith(1396);
  });

  it('GET /shows/:id — returns 404 for TMDB not found', async () => {
    const getShowDetailsSpy = jest
      .spyOn(tmdbClient, 'getShowDetails')
      .mockRejectedValue(new HttpError(404, 'The resource you requested could not be found.'));

    const response = await request(app).get('/shows/999999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'The resource you requested could not be found.',
    });
    expect(getShowDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getShowDetailsSpy).toHaveBeenCalledWith(999999);
  });

  it('GET /shows/:id — returns 502 for TMDB upstream failures', async () => {
    const getShowDetailsSpy = jest
      .spyOn(tmdbClient, 'getShowDetails')
      .mockRejectedValue(new HttpError(502, 'TMDB request failed with status 500'));

    const response = await request(app).get('/shows/1396');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'TMDB request failed with status 500',
    });
    expect(getShowDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getShowDetailsSpy).toHaveBeenCalledWith(1396);
  });

  it('GET /shows/:id — returns 502 when TMDB client throws a non-HTTP error', async () => {
    const getShowDetailsSpy = jest
      .spyOn(tmdbClient, 'getShowDetails')
      .mockRejectedValue(new Error('fetch failed'));

    const response = await request(app).get('/shows/1396');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'TMDB request failed',
    });
    expect(getShowDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getShowDetailsSpy).toHaveBeenCalledWith(1396);
  });

  it('GET /shows/:id — returns 404 for invalid id and does not call TMDB', async () => {
    const getShowDetailsSpy = jest.spyOn(tmdbClient, 'getShowDetails');
    const response = await request(app).get('/shows/abc');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Show not found',
    });
    expect(getShowDetailsSpy).not.toHaveBeenCalled();
  });
});

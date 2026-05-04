import request from 'supertest';
import { app } from '../src/app';
import { HttpError } from '../src/errors/http-error';
import { tmdbClient } from '../src/services/tmdb-client';

jest.mock('../src/services/tmdb-client', () => ({
  tmdbClient: {
    getPopularShows: jest.fn(),
  },
}));

const mockedTmdbClient = tmdbClient as jest.Mocked<typeof tmdbClient>;

const makeTmdbPopularResponse = (overrides = {}) => ({
  page: 1,
  total_pages: 1000,
  total_results: 20000,
  results: [
    {
      id: 95557,
      name: 'Invincible',
      first_air_date: '2021-03-25',
      poster_path: '/yDWJYRAwMNKbIYT8ZB33qy84uzO.jpg',
      overview:
        'An adult animated series based on the Skybound/Image comic about a teenager whose father is the most powerful superhero on the planet.',
    },
  ],
  ...overrides,
});

describe('GET /tv-shows/popular', () => {
  beforeAll(() => {
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('200 - successful response', () => {
    it('returns shaped results when page is valid', async () => {
      mockedTmdbClient.getPopularShows.mockResolvedValueOnce(makeTmdbPopularResponse());

      const response = await request(app).get('/tv-shows/popular').query({ page: '1' });

      expect(response.status).toBe(200);
      expect(mockedTmdbClient.getPopularShows).toHaveBeenCalledWith(1);
      expect(response.body).toMatchObject({
        page: 1,
        totalPages: 1000,
        totalResults: 20000,
      });
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toEqual({
        id: 95557,
        title: 'Invincible',
        year: 2021,
        posterUrl: 'https://image.tmdb.org/t/p/w500/yDWJYRAwMNKbIYT8ZB33qy84uzO.jpg',
        overview:
          'An adult animated series based on the Skybound/Image comic about a teenager whose father is the most powerful superhero on the planet.',
        mediaType: 'show',
      });
    });

    it('works without an explicit page param and defaults to page 1', async () => {
      mockedTmdbClient.getPopularShows.mockResolvedValueOnce(makeTmdbPopularResponse());

      const response = await request(app).get('/tv-shows/popular');

      expect(response.status).toBe(200);
      expect(mockedTmdbClient.getPopularShows).toHaveBeenCalledWith(1);
      expect(response.body.page).toBe(1);
    });
  });

  describe('400 - invalid query parameters', () => {
    it.each(['0', '-1', 'abc', '1.5'])('returns 400 when page is invalid: %s', async (page) => {
      const response = await request(app).get('/tv-shows/popular').query({ page });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'page must be a positive integer' });
      expect(mockedTmdbClient.getPopularShows).not.toHaveBeenCalled();
    });
  });

  describe('502 - upstream TMDB errors', () => {
    it('returns 502 when the TMDB client throws an upstream HttpError', async () => {
      mockedTmdbClient.getPopularShows.mockRejectedValueOnce(new HttpError(502, 'Invalid API key'));

      const response = await request(app).get('/tv-shows/popular').query({ page: '1' });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({ error: 'Invalid API key' });
    });

    it('returns 502 when the TMDB client throws an unexpected error', async () => {
      mockedTmdbClient.getPopularShows.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

      const response = await request(app).get('/tv-shows/popular').query({ page: '1' });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });
});

import request from 'supertest';
import { app } from '../src/app';
import { HttpError } from '../src/errors/http-error';
import { tmdbClient } from '../src/services/tmdb-client';

jest.mock('../src/services/tmdb-client', () => ({
  tmdbClient: {
    searchShows: jest.fn(),
  },
}));

const mockedTmdbClient = tmdbClient as jest.Mocked<typeof tmdbClient>;

const makeTmdbSearchResponse = (overrides = {}) => ({
  page: 1,
  total_pages: 2,
  total_results: 40,
  results: [
    {
      id: 4607,
      name: 'Lost',
      first_air_date: '2004-09-22',
      poster_path: '/ogbwjg3we0UppYjVJwVH15BReqA.jpg',
      overview:
        'The survivors of a plane crash are forced to work together in order to survive on a seemingly deserted tropical island.',
    },
  ],
  ...overrides,
});

describe('GET /shows/search', () => {
  beforeAll(() => {
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('200 - successful search', () => {
    it('returns shaped results when q and page are valid', async () => {
      mockedTmdbClient.searchShows.mockResolvedValueOnce(makeTmdbSearchResponse());

      const response = await request(app).get('/shows/search').query({ q: 'lost', page: '1' });

      expect(response.status).toBe(200);
      expect(mockedTmdbClient.searchShows).toHaveBeenCalledWith('lost', 1);
      expect(response.body).toMatchObject({
        page: 1,
        totalPages: 2,
        totalResults: 40,
      });
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toEqual({
        id: 4607,
        title: 'Lost',
        year: 2004,
        posterUrl: 'https://image.tmdb.org/t/p/w500/ogbwjg3we0UppYjVJwVH15BReqA.jpg',
        overview:
          'The survivors of a plane crash are forced to work together in order to survive on a seemingly deserted tropical island.',
        mediaType: 'show',
      });
    });

    it('works without an explicit page param and defaults to page 1', async () => {
      mockedTmdbClient.searchShows.mockResolvedValueOnce(makeTmdbSearchResponse());

      const response = await request(app).get('/shows/search').query({ q: 'lost' });

      expect(response.status).toBe(200);
      expect(mockedTmdbClient.searchShows).toHaveBeenCalledWith('lost', 1);
      expect(response.body.page).toBe(1);
    });
  });

  describe('400 - invalid query parameters', () => {
    it('returns 400 when q is omitted', async () => {
      const response = await request(app).get('/shows/search').query({ page: '1' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'q is required' });
      expect(mockedTmdbClient.searchShows).not.toHaveBeenCalled();
    });

    it('returns 400 when q is empty', async () => {
      const response = await request(app).get('/shows/search').query({ q: '', page: '1' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'q is required' });
      expect(mockedTmdbClient.searchShows).not.toHaveBeenCalled();
    });

    it.each(['0', '-1', 'abc', '1.5'])('returns 400 when page is invalid: %s', async (page) => {
      const response = await request(app).get('/shows/search').query({ q: 'lost', page });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'page must be a positive integer' });
      expect(mockedTmdbClient.searchShows).not.toHaveBeenCalled();
    });
  });

  describe('502 - upstream TMDB errors', () => {
    it('returns 502 when the TMDB client throws an upstream HttpError', async () => {
      mockedTmdbClient.searchShows.mockRejectedValueOnce(new HttpError(502, 'Invalid API key'));

      const response = await request(app).get('/shows/search').query({ q: 'lost', page: '1' });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({ error: 'Invalid API key' });
    });

    it('returns 502 when the TMDB client throws an unexpected error', async () => {
      mockedTmdbClient.searchShows.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

      const response = await request(app).get('/shows/search').query({ q: 'lost', page: '1' });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });
});

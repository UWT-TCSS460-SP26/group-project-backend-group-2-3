import request from 'supertest';
import { app } from '../src/app';
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

describe('GET /api/v2/tv-shows/popular', () => {
  beforeAll(() => {
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns shaped results when page is valid', async () => {
    mockedTmdbClient.getPopularShows.mockResolvedValueOnce(makeTmdbPopularResponse());

    const response = await request(app).get('/api/v2/tv-shows/popular').query({ page: '1' });

    expect(response.status).toBe(200);
    expect(mockedTmdbClient.getPopularShows).toHaveBeenCalledWith(1);
    expect(response.body).toEqual({
      page: 1,
      totalPages: 1000,
      totalResults: 20000,
      results: [
        {
          id: 95557,
          title: 'Invincible',
          year: 2021,
          posterUrl: 'https://image.tmdb.org/t/p/w500/yDWJYRAwMNKbIYT8ZB33qy84uzO.jpg',
          overview:
            'An adult animated series based on the Skybound/Image comic about a teenager whose father is the most powerful superhero on the planet.',
          mediaType: 'show',
        },
      ],
    });
  });
});

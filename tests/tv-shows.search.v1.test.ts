import request from 'supertest';
import { app } from '../src/app';
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

describe('GET /api/v1/tv-shows/search', () => {
  beforeAll(() => {
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns shaped results when title and page are valid', async () => {
    mockedTmdbClient.searchShows.mockResolvedValueOnce(makeTmdbSearchResponse());

    const response = await request(app).get('/api/v1/tv-shows/search').query({
      title: 'lost',
      page: '1',
    });

    expect(response.status).toBe(200);
    expect(mockedTmdbClient.searchShows).toHaveBeenCalledWith('lost', 1);
    expect(response.body).toEqual({
      page: 1,
      totalPages: 2,
      totalResults: 40,
      results: [
        {
          id: 4607,
          title: 'Lost',
          year: 2004,
          posterUrl: 'https://image.tmdb.org/t/p/w500/ogbwjg3we0UppYjVJwVH15BReqA.jpg',
          overview:
            'The survivors of a plane crash are forced to work together in order to survive on a seemingly deserted tropical island.',
          mediaType: 'show',
        },
      ],
    });
  });

  it('returns 400 when title is omitted', async () => {
    const response = await request(app).get('/api/v1/tv-shows/search').query({ page: '1' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
    expect(mockedTmdbClient.searchShows).not.toHaveBeenCalled();
  });
});

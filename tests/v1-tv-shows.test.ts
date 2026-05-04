import request from 'supertest';
import { app } from '../src/app';
import { HttpError } from '../src/errors/http-error';
import { getCommunitySummary } from '../src/services/community-summary';
import { tmdbClient } from '../src/services/tmdb-client';
import type { MediaDetailCommunity, TmdbShowDetails } from '../src/types/media';
import { buildReviewResponse } from './support/user-content-fixtures';

jest.mock('../src/services/tmdb-client', () => ({
  tmdbClient: {
    searchShows: jest.fn(),
    getPopularShows: jest.fn(),
    getShowDetails: jest.fn(),
  },
}));

jest.mock('../src/services/community-summary', () => ({
  getCommunitySummary: jest.fn(),
}));

const mockedTmdbClient = tmdbClient as jest.Mocked<typeof tmdbClient>;
const mockedGetCommunitySummary = getCommunitySummary as jest.MockedFunction<
  typeof getCommunitySummary
>;

const emptyCommunity: MediaDetailCommunity = {
  averageScore: null,
  ratingCount: 0,
  reviewCount: 0,
  recentReviews: [],
};

const breakingBadTmdbPayload: TmdbShowDetails = {
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
};

const breakingBadDetailBody = {
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
} as const;

describe('V1 TV Shows Routes', () => {
  beforeAll(() => {
    process.env.TMDB_API_KEY = process.env.TMDB_API_KEY ?? 'test-tmdb-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /v1/tv-shows/search returns transformed results (200)', async () => {
    mockedTmdbClient.searchShows.mockResolvedValueOnce({
      page: 1,
      total_pages: 2,
      total_results: 40,
      results: [
        {
          id: 4607,
          name: 'Lost',
          first_air_date: '2004-09-22',
          poster_path: '/ogbwjg3we0UppYjVJwVH15BReqA.jpg',
          overview: 'A plane crash leaves survivors stranded on an island.',
        },
      ],
    });

    const response = await request(app)
      .get('/v1/tv-shows/search')
      .query({ title: 'lost', page: '1' });

    expect(response.status).toBe(200);
    expect(mockedTmdbClient.searchShows).toHaveBeenCalledWith('lost', 1);
    expect(response.body.results[0]).toEqual({
      id: 4607,
      title: 'Lost',
      year: 2004,
      posterUrl: 'https://image.tmdb.org/t/p/w500/ogbwjg3we0UppYjVJwVH15BReqA.jpg',
      overview: 'A plane crash leaves survivors stranded on an island.',
      mediaType: 'show',
    });
  });

  it('GET /v1/tv-shows/popular validates page query (400)', async () => {
    const response = await request(app).get('/v1/tv-shows/popular').query({ page: 'abc' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'page must be a positive integer' });
    expect(mockedTmdbClient.getPopularShows).not.toHaveBeenCalled();
  });

  describe('GET /v1/tv-shows/:id — enriched TV detail', () => {
    it('returns TMDB fields and community with zero local ratings/reviews (200)', async () => {
      mockedTmdbClient.getShowDetails.mockResolvedValueOnce(breakingBadTmdbPayload);
      mockedGetCommunitySummary.mockResolvedValueOnce(emptyCommunity);

      const response = await request(app).get('/v1/tv-shows/1396');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('community');
      expect(response.body.community).toEqual({
        averageScore: null,
        ratingCount: 0,
        reviewCount: 0,
        recentReviews: [],
      });
      expect(response.body).toEqual({
        ...breakingBadDetailBody,
        community: emptyCommunity,
      });
      expect(mockedTmdbClient.getShowDetails).toHaveBeenCalledWith(1396);
      expect(mockedGetCommunitySummary).toHaveBeenCalledWith(1396, 'show');
    });

    it('returns TMDB fields and populated community summary (200)', async () => {
      const recentReview = buildReviewResponse({
        id: 501,
        tmdbId: 1396,
        mediaType: 'show',
        title: 'Binge-worthy',
        body: 'Every episode earns its runtime.',
        createdAt: new Date('2026-05-02T15:00:00.000Z'),
        updatedAt: new Date('2026-05-02T15:00:00.000Z'),
        user: { id: 77, username: 'tvfan' },
      });
      const populatedCommunity: MediaDetailCommunity = {
        averageScore: 8.5,
        ratingCount: 14,
        reviewCount: 5,
        recentReviews: [recentReview],
      };

      mockedTmdbClient.getShowDetails.mockResolvedValueOnce(breakingBadTmdbPayload);
      mockedGetCommunitySummary.mockResolvedValueOnce(populatedCommunity);

      const response = await request(app).get('/v1/tv-shows/1396');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('community');
      expect(response.body.community).toEqual(populatedCommunity);
      expect(response.body).toEqual({
        ...breakingBadDetailBody,
        community: populatedCommunity,
      });
      expect(response.body.community.recentReviews[0].mediaType).toBe('show');
      expect(mockedTmdbClient.getShowDetails).toHaveBeenCalledWith(1396);
      expect(mockedGetCommunitySummary).toHaveBeenCalledWith(1396, 'show');
    });

    it('returns 404 for invalid id and does not call TMDB or community aggregation', async () => {
      const response = await request(app).get('/v1/tv-shows/abc');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Show not found' });
      expect(mockedTmdbClient.getShowDetails).not.toHaveBeenCalled();
      expect(mockedGetCommunitySummary).not.toHaveBeenCalled();
    });
  });

  it('GET /api/v1/tv-shows/:id uses the same handler (404 invalid id)', async () => {
    const response = await request(app).get('/api/v1/tv-shows/abc');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Show not found' });
    expect(mockedTmdbClient.getShowDetails).not.toHaveBeenCalled();
    expect(mockedGetCommunitySummary).not.toHaveBeenCalled();
  });

  it('GET /v1/tv-shows/:id returns upstream 404 from TMDB', async () => {
    mockedTmdbClient.getShowDetails.mockRejectedValueOnce(
      new HttpError(404, 'The resource you requested could not be found.')
    );

    const response = await request(app).get('/v1/tv-shows/999999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'The resource you requested could not be found.' });
    expect(mockedGetCommunitySummary).not.toHaveBeenCalled();
  });

  it('GET /v1/tv-shows/:id returns 502 for non-HTTP errors', async () => {
    mockedTmdbClient.getShowDetails.mockRejectedValueOnce(new Error('fetch failed'));

    const response = await request(app).get('/v1/tv-shows/1396');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'TMDB request failed' });
    expect(mockedGetCommunitySummary).not.toHaveBeenCalled();
  });
});

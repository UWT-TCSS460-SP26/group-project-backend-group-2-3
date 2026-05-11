import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../src/errors/http-error';
import { prisma } from '../src/lib/prisma';
import { tmdbClient } from '../src/services/tmdb-client';
import { listTopRatedDiscovery } from '../src/controllers/v1/discover';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

const mockTransaction = prisma.$transaction as jest.Mock;
const queryRawMock = prisma.$queryRaw as jest.Mock;

const createRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    query: {},
    ...overrides,
  }) as Request;

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return response as unknown as Response;
};

describe('listTopRatedDiscovery', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TMDB_API_KEY = 'test-api-key';
    mockTransaction.mockImplementation(async (queries: unknown[]) => Promise.all(queries));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an empty paginated response when the database has no ranked items', async () => {
    const request = createRequest();
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    queryRawMock.mockResolvedValueOnce([{ totalResults: 0 }]).mockResolvedValueOnce([]);

    await listTopRatedDiscovery(request, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      totalPages: 0,
      totalResults: 0,
      results: [],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('filters out below-threshold items at the SQL aggregate layer', async () => {
    const request = createRequest();
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    queryRawMock
      .mockResolvedValueOnce([{ totalResults: 1 }])
      .mockResolvedValueOnce([
        { tmdbId: 550, mediaType: 'movie', averageScore: 9.5, ratingCount: 3 },
      ]);
    jest.spyOn(tmdbClient, 'getMovieDetails').mockResolvedValue({
      backdrop_path: '/backdrop.jpg',
      genres: [],
      id: 550,
      overview: 'An insomniac office worker crosses paths with a soap maker.',
      poster_path: '/poster.jpg',
      release_date: '1999-10-15',
      runtime: 139,
      status: 'Released',
      title: 'Fight Club',
      vote_average: 8.4,
    });

    await listTopRatedDiscovery(request, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalResults: 1,
        results: [expect.objectContaining({ tmdbId: 550, ratingCount: 3 })],
      })
    );
    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves top-rated ordering from the SQL aggregate', async () => {
    const request = createRequest();
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    queryRawMock
      .mockResolvedValueOnce([{ totalResults: 2 }])
      .mockResolvedValueOnce([
        { tmdbId: 550, mediaType: 'movie', averageScore: 9.5, ratingCount: 4 },
        { tmdbId: 1396, mediaType: 'show', averageScore: 9.0, ratingCount: 5 },
      ]);
    jest.spyOn(tmdbClient, 'getMovieDetails').mockResolvedValue({
      backdrop_path: '/backdrop.jpg',
      genres: [],
      id: 550,
      overview: 'An insomniac office worker crosses paths with a soap maker.',
      poster_path: '/poster.jpg',
      release_date: '1999-10-15',
      runtime: 139,
      status: 'Released',
      title: 'Fight Club',
      vote_average: 8.4,
    });
    jest.spyOn(tmdbClient, 'getShowDetails').mockResolvedValue({
      backdrop_path: '/backdrop.jpg',
      first_air_date: '2008-01-20',
      genres: [],
      id: 1396,
      name: 'Breaking Bad',
      number_of_episodes: 62,
      number_of_seasons: 5,
      overview: 'A high school chemistry teacher turned meth producer.',
      poster_path: '/poster-show.jpg',
      status: 'Ended',
      vote_average: 8.9,
    });

    await listTopRatedDiscovery(request, response, next);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [
          expect.objectContaining({ tmdbId: 550, averageScore: 9.5, ratingCount: 4 }),
          expect.objectContaining({ tmdbId: 1396, averageScore: 9, ratingCount: 5 }),
        ],
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('does not crash the request when TMDB metadata is unavailable for one item', async () => {
    const request = createRequest();
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    queryRawMock
      .mockResolvedValueOnce([{ totalResults: 2 }])
      .mockResolvedValueOnce([
        { tmdbId: 550, mediaType: 'movie', averageScore: 9.5, ratingCount: 4 },
        { tmdbId: 1396, mediaType: 'show', averageScore: 9.0, ratingCount: 5 },
      ]);
    jest
      .spyOn(tmdbClient, 'getMovieDetails')
      .mockRejectedValue(new HttpError(502, 'TMDB request failed with status 500'));
    jest.spyOn(tmdbClient, 'getShowDetails').mockResolvedValue({
      backdrop_path: '/backdrop.jpg',
      first_air_date: '2008-01-20',
      genres: [],
      id: 1396,
      name: 'Breaking Bad',
      number_of_episodes: 62,
      number_of_seasons: 5,
      overview: 'A high school chemistry teacher turned meth producer.',
      poster_path: '/poster-show.jpg',
      status: 'Ended',
      vote_average: 8.9,
    });

    await listTopRatedDiscovery(request, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [expect.objectContaining({ tmdbId: 1396, mediaType: 'show' })],
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

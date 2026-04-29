import request from 'supertest';
import { app } from '../src/app';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  process.env.TMDB_API_KEY = 'test-api-key';
});

const tmdbMovieListItem = {
  id: 550,
  title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/example.jpg',
  overview: 'An insomniac office worker crosses paths with a soap maker.',
};

const tmdbListPage = (results: unknown[]) => ({
  page: 1,
  total_pages: 5,
  total_results: 92,
  results,
});

const expectedListResponse = {
  page: 1,
  totalPages: 5,
  totalResults: 92,
  results: [
    {
      id: 550,
      title: 'Fight Club',
      year: 1999,
      posterUrl: 'https://image.tmdb.org/t/p/w500/example.jpg',
      overview: 'An insomniac office worker crosses paths with a soap maker.',
      mediaType: 'movie',
    },
  ],
};

const mockTmdbSuccess = (results: unknown[]) => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => tmdbListPage(results),
  });
};

const mockTmdbNetworkFailure = () => {
  mockFetch.mockRejectedValue(new Error('Network error'));
};

const mockTmdbServerError = () => {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ status_message: 'Internal error' }),
  });
};

// ---------------------------------------------------------------------------
// GET /v1/movies/search — v1 contract: title param replaces q
// ---------------------------------------------------------------------------

describe('GET /v1/movies/search', () => {
  it('200 — returns transformed list when title is provided', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/v1/movies/search?title=Fight+Club');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expectedListResponse);
  });

  it('200 — response shape matches list contract', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/v1/movies/search?title=Fight+Club');
    const item = res.body.results[0];

    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('year');
    expect(item).toHaveProperty('posterUrl');
    expect(item).toHaveProperty('overview');
    expect(item).toHaveProperty('mediaType', 'movie');
  });

  it('200 — posterUrl is a full URL, not a raw path', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/v1/movies/search?title=Fight+Club');

    expect(res.body.results[0].posterUrl).toMatch(/^https:\/\/image\.tmdb\.org/);
  });

  it('200 — raw TMDB fields do not leak into response', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/v1/movies/search?title=Fight+Club');
    const item = res.body.results[0];

    expect(item).not.toHaveProperty('release_date');
    expect(item).not.toHaveProperty('poster_path');
    expect(item).not.toHaveProperty('vote_average');
  });

  it('200 — page 2 is accepted and passed through', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/v1/movies/search?title=Fight+Club&page=2');

    expect(res.status).toBe(200);
  });

  it('400 — missing title returns error', async () => {
    const res = await request(app).get('/v1/movies/search');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — empty title returns error', async () => {
    const res = await request(app).get('/v1/movies/search?title=');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — q param alone is rejected (v1 requires title, not q)', async () => {
    const res = await request(app).get('/v1/movies/search?q=Fight+Club');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — non-integer page returns error', async () => {
    const res = await request(app).get('/v1/movies/search?title=Fight+Club&page=abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — page 0 returns error', async () => {
    const res = await request(app).get('/v1/movies/search?title=Fight+Club&page=0');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — negative page returns error', async () => {
    const res = await request(app).get('/v1/movies/search?title=Fight+Club&page=-1');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('502 — TMDB network failure returns upstream error', async () => {
    mockTmdbNetworkFailure();

    const res = await request(app).get('/v1/movies/search?title=Fight+Club');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });

  it('502 — TMDB server error returns upstream error', async () => {
    mockTmdbServerError();

    const res = await request(app).get('/v1/movies/search?title=Fight+Club');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });
});

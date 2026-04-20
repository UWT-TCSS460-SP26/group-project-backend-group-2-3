import request from 'supertest';
import { app } from '../src/app';

// Replace the global fetch with a mock so we never call real TMDB in tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  // Reset the mock before each test so one test cannot affect another
  mockFetch.mockReset();
  // Provide a fake API key so getTmdbConfig() does not throw
  process.env.TMDB_API_KEY = 'test-api-key';
});

// ---------------------------------------------------------------------------
// Shared TMDB response shapes (based on API design doc, not implementation)
// ---------------------------------------------------------------------------

// What TMDB sends back for a movie list item (raw, snake_case)
const tmdbMovieListItem = {
  id: 550,
  title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/example.jpg',
  overview: 'An insomniac office worker crosses paths with a soap maker.',
};

// What TMDB sends back for a paginated list
const tmdbListPage = (results: unknown[]) => ({
  page: 1,
  total_pages: 5,
  total_results: 92,
  results,
});

// What our API contract says the response must look like (camelCase, full URLs)
const expectedListItem = {
  id: 550,
  title: 'Fight Club',
  year: 1999,
  posterUrl: 'https://image.tmdb.org/t/p/w500/example.jpg',
  overview: 'An insomniac office worker crosses paths with a soap maker.',
  mediaType: 'movie',
};

const expectedListResponse = {
  page: 1,
  totalPages: 5,
  totalResults: 92,
  results: [expectedListItem],
};

// Helper: make fetch resolve with a successful TMDB list response
const mockTmdbSuccess = (results: unknown[]) => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => tmdbListPage(results),
  });
};

// Helper: make fetch reject entirely (network down, DNS failure, etc.)
const mockTmdbNetworkFailure = () => {
  mockFetch.mockRejectedValue(new Error('Network error'));
};

// Helper: make fetch resolve but with a TMDB server error
const mockTmdbServerError = () => {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ status_message: 'Internal error' }),
  });
};

// ---------------------------------------------------------------------------
// GET /movies/search
// Spec: q required, page optional positive integer, default 1
// ---------------------------------------------------------------------------

describe('GET /movies/search', () => {
  it('200 — returns transformed list when q is provided', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/search?q=Fight+Club');

    // Spec says 200 with { page, totalPages, totalResults, results[] }
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expectedListResponse);
  });

  it('200 — each result contains all required spec fields', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/search?q=Fight+Club');

    const item = res.body.results[0];
    // Spec requires: id, title, year, posterUrl, overview, mediaType
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('year');
    expect(item).toHaveProperty('posterUrl');
    expect(item).toHaveProperty('overview');
    expect(item).toHaveProperty('mediaType');
  });

  it('200 — mediaType is always "movie", never raw TMDB field names', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/search?q=Fight+Club');

    const item = res.body.results[0];
    // Spec says mediaType must be "movie" for movie results
    expect(item.mediaType).toBe('movie');
    // Raw TMDB fields must never leak into the response
    expect(item).not.toHaveProperty('release_date');
    expect(item).not.toHaveProperty('poster_path');
    expect(item).not.toHaveProperty('vote_average');
  });

  it('200 — posterUrl is a full URL, not a raw TMDB path', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/search?q=Fight+Club');

    // Spec says posterUrl must be the full image URL, not just "/example.jpg"
    expect(res.body.results[0].posterUrl).toMatch(/^https:\/\/image\.tmdb\.org/);
  });

  it('200 — page 2 is accepted and passed through', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/search?q=Fight+Club&page=2');

    expect(res.status).toBe(200);
  });

  it('400 — missing q returns error with message', async () => {
    const res = await request(app).get('/movies/search');

    // Spec: q is required — missing it must return 400
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — empty q returns error', async () => {
    const res = await request(app).get('/movies/search?q=');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — non-integer page returns error', async () => {
    const res = await request(app).get('/movies/search?q=Fight+Club&page=abc');

    // Spec: page must be a positive integer
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — page 0 returns error', async () => {
    const res = await request(app).get('/movies/search?q=Fight+Club&page=0');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — negative page returns error', async () => {
    const res = await request(app).get('/movies/search?q=Fight+Club&page=-1');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('502 — TMDB network failure returns upstream error', async () => {
    mockTmdbNetworkFailure();

    const res = await request(app).get('/movies/search?q=Fight+Club');

    // Spec: upstream failure must return 502
    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });

  it('502 — TMDB server error returns upstream error', async () => {
    mockTmdbServerError();

    const res = await request(app).get('/movies/search?q=Fight+Club');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// GET /movies/popular
// Spec: page optional positive integer, default 1, no required params
// ---------------------------------------------------------------------------

describe('GET /movies/popular', () => {
  it('200 — returns transformed list with no parameters', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/popular');

    // Spec says 200 with { page, totalPages, totalResults, results[] }
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expectedListResponse);
  });

  it('200 — each result contains all required spec fields', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/popular');

    const item = res.body.results[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('year');
    expect(item).toHaveProperty('posterUrl');
    expect(item).toHaveProperty('overview');
    expect(item).toHaveProperty('mediaType');
  });

  it('200 — mediaType is always "movie", never raw TMDB field names', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/popular');

    const item = res.body.results[0];
    expect(item.mediaType).toBe('movie');
    expect(item).not.toHaveProperty('release_date');
    expect(item).not.toHaveProperty('poster_path');
    expect(item).not.toHaveProperty('vote_average');
  });

  it('200 — posterUrl is a full URL, not a raw TMDB path', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/popular');

    expect(res.body.results[0].posterUrl).toMatch(/^https:\/\/image\.tmdb\.org/);
  });

  it('200 — page 2 is accepted', async () => {
    mockTmdbSuccess([tmdbMovieListItem]);

    const res = await request(app).get('/movies/popular?page=2');

    expect(res.status).toBe(200);
  });

  it('400 — non-integer page returns error', async () => {
    const res = await request(app).get('/movies/popular?page=abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — page 0 returns error', async () => {
    const res = await request(app).get('/movies/popular?page=0');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — negative page returns error', async () => {
    const res = await request(app).get('/movies/popular?page=-1');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('502 — TMDB network failure returns upstream error', async () => {
    mockTmdbNetworkFailure();

    const res = await request(app).get('/movies/popular');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });

  it('502 — TMDB server error returns upstream error', async () => {
    mockTmdbServerError();

    const res = await request(app).get('/movies/popular');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });
});

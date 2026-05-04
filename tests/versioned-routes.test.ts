import request from 'supertest';
import { app } from '../src/app';

describe('Versioned Route Mounts', () => {
  it('GET /v1/movies/search without title returns 400 (route is mounted)', async () => {
    const response = await request(app).get('/v1/movies/search');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Query parameter title is required' });
  });

  it('GET /api/v1/movies/search without title returns 400 (legacy alias still mounted)', async () => {
    const response = await request(app).get('/api/v1/movies/search');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Query parameter title is required' });
  });

  it('GET /v1/tv-shows/search without title returns 400 (promoted v2 route is mounted in v1)', async () => {
    const response = await request(app).get('/v1/tv-shows/search');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
  });

  it('GET /api/v1/tv-shows/search without title returns 400 (legacy alias still mounted)', async () => {
    const response = await request(app).get('/api/v1/tv-shows/search');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
  });

  it('GET /v2/movies/search returns 404 (v2 route layer is removed)', async () => {
    const response = await request(app).get('/v2/movies/search');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });

  it('GET /api/v2/movies/search returns 404 (v2 legacy alias is removed)', async () => {
    const response = await request(app).get('/api/v2/movies/search');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });

  it('GET /shows/search returns 404 (old v1 show path is replaced by tv-shows)', async () => {
    const response = await request(app).get('/shows/search');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });

  it('GET /api/v2/tv-shows/search returns 404 (v2 tv-show alias is removed)', async () => {
    const response = await request(app).get('/api/v2/tv-shows/search');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });
});

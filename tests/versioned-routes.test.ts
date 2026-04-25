import request from 'supertest';
import { app } from '../src/app';

describe('Versioned Route Mounts', () => {
  it('GET /v1/movies/search without q returns 400 (route is mounted)', async () => {
    const response = await request(app).get('/v1/movies/search');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /v2/movies/search without title returns 400 (route is mounted)', async () => {
    const response = await request(app).get('/v2/movies/search');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /v2/tv-shows/search without q returns 400 (route is mounted)', async () => {
    const response = await request(app).get('/v2/tv-shows/search');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/v1/movies/search without q returns 400 (legacy alias still mounted)', async () => {
    const response = await request(app).get('/api/v1/movies/search');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/v2/movies/search without title returns 400 (legacy alias still mounted)', async () => {
    const response = await request(app).get('/api/v2/movies/search');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/v2/tv-shows/search without q returns 400 (legacy alias still mounted)', async () => {
    const response = await request(app).get('/api/v2/tv-shows/search');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

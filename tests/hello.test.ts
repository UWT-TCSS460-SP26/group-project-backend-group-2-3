import request from 'supertest';
import { app } from '../src/app';

describe('Health Route', () => {
  it('GET /health — returns service heartbeat', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'group-project-backend-group-2-3',
    });
  });
});

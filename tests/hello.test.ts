import request from 'supertest';
import { app } from '../src/app';

describe('Hello Route', () => {
  it('GET /hello — returns greeting message', async () => {
    const response = await request(app).get('/hello');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello, TCSS 460!');
  });

  it('GET /hello/rudolf — returns personal greeting message', async () => {
    const response = await request(app).get('/hello/rudolf');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello, Rudolf!');
  });

  it('GET /hello/rudolf-practice — returns temporary practice greeting', async () => {
    const response = await request(app).get('/hello/rudolf-practice');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Hello again, Rudolf!');
  });
});

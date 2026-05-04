import request from 'supertest';
import { authHeader, createAccessToken, createMutationAuthTestApp } from './support/auth-fixtures';
import { USER_ROLES } from '../src/types/auth';

describe('mutation auth: ownership and role behavior', () => {
  const app = createMutationAuthTestApp();

  describe('PATCH /test/reviews/:id (owner required)', () => {
    it('200 for owner update', async () => {
      const token = createAccessToken({ sub: 1, email: 'owner@example.test' });

      const response = await request(app)
        .patch('/test/reviews/owned')
        .set(authHeader(token))
        .send({ text: 'updated content' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        id: 'owned',
        updatedBy: 1,
      });
    });

    it('401 when token is missing', async () => {
      const response = await request(app).patch('/test/reviews/owned').send({ text: 'no auth' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/missing or malformed authorization header/i);
    });

    it('401 when token is invalid', async () => {
      const response = await request(app)
        .patch('/test/reviews/owned')
        .set(authHeader('not-a-valid-jwt'))
        .send({ text: 'bad token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid/i);
    });

    it('403 when authenticated user is not owner', async () => {
      const token = createAccessToken({ sub: 2, email: 'other@example.test' });

      const response = await request(app)
        .patch('/test/reviews/owned')
        .set(authHeader(token))
        .send({ text: 'forbidden edit' });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/do not have permission/i);
    });

    it('404 when target resource does not exist', async () => {
      const token = createAccessToken({ sub: 1, email: 'owner@example.test' });

      const response = await request(app)
        .patch('/test/reviews/missing')
        .set(authHeader(token))
        .send({ text: 'missing resource' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Resource not found' });
    });
  });

  describe('DELETE /test/reviews/:id (owner or admin)', () => {
    it('200 for owner delete', async () => {
      const token = createAccessToken({ sub: 1, email: 'owner@example.test' });

      const response = await request(app).delete('/test/reviews/owned').set(authHeader(token));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        id: 'owned',
        deletedBy: 1,
      });
    });

    it('403 when authenticated user is not owner and not admin', async () => {
      const token = createAccessToken({ sub: 1, email: 'user1@example.test' });

      const response = await request(app).delete('/test/reviews/nonOwned').set(authHeader(token));

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/do not have permission/i);
    });

    it('200 when admin deletes non-owned review', async () => {
      const token = createAccessToken({
        sub: 1,
        email: 'admin@example.test',
        role: USER_ROLES.admin,
      });

      const response = await request(app).delete('/test/reviews/nonOwned').set(authHeader(token));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        id: 'nonOwned',
        deletedBy: 1,
      });
    });

    it('404 when delete target does not exist', async () => {
      const token = createAccessToken({ sub: 1, email: 'owner@example.test' });

      const response = await request(app).delete('/test/reviews/missing').set(authHeader(token));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Resource not found' });
    });
  });
});

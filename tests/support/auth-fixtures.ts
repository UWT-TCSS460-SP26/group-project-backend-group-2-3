import express, { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../../src/middleware/error-handler';
import { requireAuth } from '../../src/middleware/requireAuth';
import { USER_ROLES, AuthenticatedUser } from '../../src/types/auth';
import { assertOwner, assertOwnerOrAdmin } from '../../src/utils/authorization';

export const TEST_JWT_SECRET = 'test-jwt-secret';

export interface MutationResource {
  id: string;
  ownerId: number;
  text: string;
}

interface MutationParams extends ParamsDictionary {
  id: string;
}

const defaultResources: Record<string, MutationResource> = {
  owned: { id: 'owned', ownerId: 1, text: 'owner resource' },
  nonOwned: { id: 'nonOwned', ownerId: 2, text: 'other resource' },
};

export const createAccessToken = (overrides: Partial<AuthenticatedUser> = {}): string => {
  const payload: AuthenticatedUser = {
    sub: 1,
    email: 'user1@example.test',
    role: USER_ROLES.user,
    ...overrides,
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
};

export const authHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

export const createMutationAuthTestApp = (
  resources: Record<string, MutationResource> = defaultResources
) => {
  const app = express();
  app.use(express.json());

  const getResourceOrNotFound = (
    request: Request<MutationParams>,
    response: Response
  ): MutationResource | null => {
    const resource = resources[request.params.id];
    if (!resource) {
      response.status(404).json({ error: 'Resource not found' });
      return null;
    }

    return resource;
  };

  const ensureOwner = (request: Request<MutationParams>, resource: MutationResource): void => {
    assertOwner(request.user, resource.ownerId);
  };

  const ensureOwnerOrAdmin = (request: Request<MutationParams>, resource: MutationResource): void => {
    assertOwnerOrAdmin(request.user, resource.ownerId);
  };

  app.patch<MutationParams>(
    '/test/reviews/:id',
    requireAuth,
    (request: Request<MutationParams>, response: Response) => {
      const resource = getResourceOrNotFound(request, response);
      if (!resource) return;

      ensureOwner(request, resource);
      response.status(200).json({ ok: true, id: resource.id, updatedBy: request.user?.sub });
    }
  );

  app.delete<MutationParams>(
    '/test/reviews/:id',
    requireAuth,
    (request: Request<MutationParams>, response: Response) => {
      const resource = getResourceOrNotFound(request, response);
      if (!resource) return;

      ensureOwnerOrAdmin(request, resource);
      response.status(200).json({ ok: true, id: resource.id, deletedBy: request.user?.sub });
    }
  );

  app.use(errorHandler);

  return app;
};

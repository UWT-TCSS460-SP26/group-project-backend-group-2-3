import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../errors/http-error';
import { HTTP_STATUS } from '../types/api';
import { AuthenticatedUser, UserRole } from '../types/auth';

/**
 * Verifies the Authorization: Bearer <token> header using JWT_SECRET and
 * attaches the decoded payload to request.user. Responds 401 when the
 * header is missing, malformed, or the token is invalid/expired.
 */
export const requireAuth = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new HttpError(HTTP_STATUS.internalServerError, 'JWT_SECRET is not configured'));
    return;
  }

  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, secret) as AuthenticatedUser;
    request.user = payload;
    next();
  } catch {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Invalid or expired token'));
  }
};

/**
 * Role gate. Use after requireAuth:
 *
 *   router.delete('/reviews/:id', requireAuth, requireRole('admin'), handler);
 */
export const requireRole = (role: UserRole) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
      return;
    }
    if (request.user.role !== role) {
      next(new HttpError(HTTP_STATUS.forbidden, 'Insufficient permissions'));
      return;
    }
    next();
  };
};

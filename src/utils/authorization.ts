import { HttpError } from '../errors/http-error';
import { HTTP_STATUS } from '../types/api';
import { AuthenticatedUser, USER_ROLES } from '../types/auth';

const requireAuthenticatedUser = (user: AuthenticatedUser | undefined): AuthenticatedUser => {
  if (!user) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated');
  }

  return user;
};

export const isOwner = (user: AuthenticatedUser | undefined, ownerId: number): boolean =>
  user?.sub === ownerId;

export const isAdmin = (user: AuthenticatedUser | undefined): boolean =>
  user?.role === USER_ROLES.admin;

export const assertOwner = (
  user: AuthenticatedUser | undefined,
  ownerId: number,
  message = 'You do not have permission to modify this resource'
): AuthenticatedUser => {
  const authenticatedUser = requireAuthenticatedUser(user);

  if (!isOwner(authenticatedUser, ownerId)) {
    throw new HttpError(HTTP_STATUS.forbidden, message);
  }

  return authenticatedUser;
};

export const assertOwnerOrAdmin = (
  user: AuthenticatedUser | undefined,
  ownerId: number,
  message = 'You do not have permission to modify this resource'
): AuthenticatedUser => {
  const authenticatedUser = requireAuthenticatedUser(user);

  if (!isOwner(authenticatedUser, ownerId) && !isAdmin(authenticatedUser)) {
    throw new HttpError(HTTP_STATUS.forbidden, message);
  }

  return authenticatedUser;
};

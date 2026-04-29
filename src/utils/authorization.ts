import { HttpError } from '../errors/http-error';
import { HTTP_STATUS } from '../types/api';
import { AuthenticatedUser, USER_ROLES, UserRole } from '../types/auth';

const ROLE_RANK: Record<UserRole, number> = {
  [USER_ROLES.user]: 1,
  [USER_ROLES.moderator]: 2,
  [USER_ROLES.admin]: 3,
  [USER_ROLES.superAdmin]: 4,
  [USER_ROLES.owner]: 5,
};

const requireAuthenticatedUser = (user: AuthenticatedUser | undefined): AuthenticatedUser => {
  if (!user) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated');
  }

  return user;
};

export const isOwner = (user: AuthenticatedUser | undefined, ownerId: number): boolean =>
  user?.sub === ownerId;

export const hasRoleAtLeast = (
  user: AuthenticatedUser | undefined,
  requiredRole: UserRole
): boolean => {
  if (!user) {
    return false;
  }

  return ROLE_RANK[user.role] >= ROLE_RANK[requiredRole];
};

export const isAdmin = (user: AuthenticatedUser | undefined): boolean =>
  hasRoleAtLeast(user, USER_ROLES.admin);

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

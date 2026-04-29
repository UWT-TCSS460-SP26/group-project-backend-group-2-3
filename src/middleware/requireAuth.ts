import { Buffer } from 'node:buffer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import { HttpError } from '../errors/http-error';
import { HTTP_STATUS } from '../types/api';
import { AuthenticatedUser, normalizeUserRole, USER_ROLES, UserRole } from '../types/auth';
import { hasRoleAtLeast } from '../utils/authorization';

interface Auth2Claims {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  roles?: unknown;
  permissions?: unknown;
  [claim: string]: unknown;
}

const TEST_AUTH_HEADER = 'x-test-auth';
const ROLE_CLAIM_NAMES = ['role', 'roles'];
const LOCAL_USER_ID_CLAIM_NAMES = [
  'local_user_id',
  'localUserId',
  'app_user_id',
  'appUserId',
  'user_id',
  'userId',
];

let cachedJwksAuth: RequestHandler | null = null;

const readRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new HttpError(HTTP_STATUS.internalServerError, `${name} is not configured`);
  }

  return value;
};

const getJwksUri = (issuer: string): string =>
  `${issuer.replace(/\/+$/, '')}/.well-known/jwks.json`;

const loadJwksRsa = (): typeof import('jwks-rsa') =>
  // Jest stays on the test-auth stub path and cannot parse jwks-rsa's ESM jose dependency.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('jwks-rsa') as typeof import('jwks-rsa');

const getBearerToken = (request: Request): string | undefined => {
  const header = request.headers.authorization;
  if (!header) {
    return undefined;
  }

  const [scheme, token, extra] = header.split(' ');
  if (scheme !== 'Bearer' || !token || extra) {
    return undefined;
  }

  return token;
};

const getJwksAuthMiddleware = (): RequestHandler => {
  if (cachedJwksAuth) {
    return cachedJwksAuth;
  }

  const issuer = readRequiredEnv('AUTH_ISSUER');
  const audience = readRequiredEnv('API_AUDIENCE');
  const jwksRsa = loadJwksRsa();

  cachedJwksAuth = expressjwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: getJwksUri(issuer),
    }) as GetVerificationKey,
    audience,
    issuer,
    algorithms: ['RS256'],
    credentialsRequired: true,
    getToken: getBearerToken,
    requestProperty: 'auth',
  });

  return cachedJwksAuth;
};

const isNamespacedClaim = (claimName: string, suffix: string): boolean =>
  claimName.endsWith(`/${suffix}`);

const getClaimValue = (claims: Auth2Claims, claimNames: string[]): unknown => {
  for (const claimName of claimNames) {
    const value = claims[claimName];
    if (value !== undefined) {
      return value;
    }
  }

  const matchingEntry = Object.entries(claims).find(([claimName]) =>
    claimNames.some((candidate) => isNamespacedClaim(claimName, candidate))
  );

  return matchingEntry?.[1];
};

const getHighestRole = (roles: UserRole[]): UserRole => {
  if (roles.includes(USER_ROLES.owner)) return USER_ROLES.owner;
  if (roles.includes(USER_ROLES.superAdmin)) return USER_ROLES.superAdmin;
  if (roles.includes(USER_ROLES.admin)) return USER_ROLES.admin;
  if (roles.includes(USER_ROLES.moderator)) return USER_ROLES.moderator;
  return USER_ROLES.user;
};

const getRoleFromClaims = (claims: Auth2Claims): UserRole => {
  const roleClaim = getClaimValue(claims, ROLE_CLAIM_NAMES);
  const roleCandidates = Array.isArray(roleClaim) ? roleClaim : [roleClaim];
  const roles = roleCandidates
    .map((candidate) => normalizeUserRole(candidate))
    .filter((role): role is UserRole => role !== null);

  return roles.length > 0 ? getHighestRole(roles) : USER_ROLES.user;
};

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return null;
};

const getLocalUserId = (claims: Auth2Claims, subjectId: string): number => {
  const localUserId = parsePositiveInteger(getClaimValue(claims, LOCAL_USER_ID_CLAIM_NAMES));
  if (localUserId !== null) {
    return localUserId;
  }

  return parsePositiveInteger(subjectId) ?? 0;
};

const toAuthenticatedUser = (claims: Auth2Claims | undefined): AuthenticatedUser => {
  if (!claims) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Token subject is missing');
  }

  const subjectId = typeof claims.sub === 'string' ? claims.sub.trim() : '';
  if (!subjectId) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Token subject is missing');
  }

  const email =
    typeof claims.email === 'string' && claims.email.trim() ? claims.email.trim() : undefined;

  return {
    sub: getLocalUserId(claims, subjectId),
    subjectId,
    email,
    role: getRoleFromClaims(claims),
  };
};

const decodeTestClaims = (encodedClaims: string): Auth2Claims => {
  try {
    return JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8')) as Auth2Claims;
  } catch {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Invalid test auth header');
  }
};

const handleTestAuth = (request: Request, next: NextFunction): void => {
  const encodedClaims = request.header(TEST_AUTH_HEADER);
  if (encodedClaims) {
    request.user = toAuthenticatedUser(decodeTestClaims(encodedClaims));
    next();
    return;
  }

  if (!getBearerToken(request)) {
    next(new HttpError(HTTP_STATUS.unauthorized, 'Missing or malformed Authorization header'));
    return;
  }

  next(new HttpError(HTTP_STATUS.unauthorized, 'Invalid or expired token'));
};

const mapJwtError = (error: unknown): HttpError => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  const message =
    code === 'credentials_required'
      ? 'Missing or malformed Authorization header'
      : 'Invalid or expired token';

  return new HttpError(HTTP_STATUS.unauthorized, message);
};

/**
 * Verifies the Authorization: Bearer <token> header using Auth2 JWKS and
 * attaches normalized claims to request.user. Responds 401 when the
 * header is missing, malformed, or the token is invalid/expired.
 */
export const requireAuth = (request: Request, response: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'test') {
    handleTestAuth(request, next);
    return;
  }

  try {
    getJwksAuthMiddleware()(request, response, (error?: unknown) => {
      if (error) {
        next(mapJwtError(error));
        return;
      }

      try {
        const claims = (request as Request & { auth?: Auth2Claims }).auth;
        request.user = toAuthenticatedUser(claims);
        next();
      } catch (claimError) {
        next(claimError);
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Role gate. Use after requireAuth:
 *
 *   router.delete('/reviews/:id', requireAuth, requireRole(USER_ROLES.admin), handler);
 */
export const requireRole = (role: UserRole) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
      return;
    }
    if (!hasRoleAtLeast(request.user, role)) {
      next(new HttpError(HTTP_STATUS.forbidden, 'Insufficient permissions'));
      return;
    }
    next();
  };
};

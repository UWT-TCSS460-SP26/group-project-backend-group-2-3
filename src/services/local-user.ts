import { Buffer } from 'node:buffer';
import { User, UserRole as PrismaUserRole } from '@prisma/client';
import { Request } from 'express';
import { HttpError } from '../errors/http-error';
import { prisma } from '../lib/prisma';
import { HTTP_STATUS } from '../types/api';
import { USER_ROLES } from '../types/auth';
import { hasRoleAtLeast } from '../utils/authorization';

interface Auth2UserInfo {
  sub?: unknown;
  username?: unknown;
  preferred_username?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  name?: unknown;
  [claim: string]: unknown;
}

interface LocalUserProfile {
  subjectId: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

const readRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new HttpError(HTTP_STATUS.internalServerError, `${name} is not configured`);
  }

  return value;
};

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const readBearerToken = (request: Request): string => {
  const header = request.headers.authorization;
  const [scheme, token, extra] = header?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token || extra) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Missing or malformed Authorization header');
  }

  return token;
};

const getUserInfoUrl = (): string =>
  `${readRequiredEnv('AUTH_ISSUER').replace(/\/+$/, '')}/v2/oauth/userinfo`;

const fetchUserInfo = async (request: Request): Promise<Auth2UserInfo> => {
  const response = await fetch(getUserInfoUrl(), {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${readBearerToken(request)}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(
      HTTP_STATUS.badGateway,
      `Auth2 userinfo failed with status ${response.status}`
    );
  }

  return (await response.json()) as Auth2UserInfo;
};

const subjectKey = (subjectId: string): string =>
  Buffer.from(subjectId).toString('base64url').slice(0, 48);

const fallbackUsername = (subjectId: string): string => `auth2-${subjectKey(subjectId)}`;

const fallbackEmail = (subjectId: string): string => `${fallbackUsername(subjectId)}@auth2.local`;

const normalizeUsername = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const splitDisplayName = (
  name: string | null
): Pick<LocalUserProfile, 'firstName' | 'lastName'> => {
  if (!name) {
    return { firstName: null, lastName: null };
  }

  const [firstName, ...rest] = name.split(/\s+/);
  return {
    firstName: firstName || null,
    lastName: rest.length > 0 ? rest.join(' ') : null,
  };
};

const profileFromUserInfo = (subjectId: string, userInfo: Auth2UserInfo): LocalUserProfile => {
  const userInfoSubject = readNonEmptyString(userInfo.sub);
  if (userInfoSubject && userInfoSubject !== subjectId) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Userinfo subject does not match token subject');
  }

  const email = readNonEmptyString(userInfo.email);
  const username =
    readNonEmptyString(userInfo.username) ??
    readNonEmptyString(userInfo.preferred_username) ??
    email?.split('@')[0] ??
    fallbackUsername(subjectId);
  const displayName = splitDisplayName(readNonEmptyString(userInfo.name));

  return {
    subjectId,
    username: normalizeUsername(username) || fallbackUsername(subjectId),
    email: email ?? fallbackEmail(subjectId),
    firstName:
      readNonEmptyString(userInfo.firstName) ??
      readNonEmptyString(userInfo.given_name) ??
      displayName.firstName,
    lastName:
      readNonEmptyString(userInfo.lastName) ??
      readNonEmptyString(userInfo.family_name) ??
      displayName.lastName,
  };
};

const getUniqueUsername = async (
  preferredUsername: string,
  subjectId: string,
  currentUserId?: number
): Promise<string> => {
  const username = normalizeUsername(preferredUsername) || fallbackUsername(subjectId);
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true, subjectId: true },
  });

  if (!existing || existing.id === currentUserId || existing.subjectId === subjectId) {
    return username;
  }

  return fallbackUsername(subjectId);
};

const mapAuthRoleToDbRole = (request: Request): PrismaUserRole =>
  hasRoleAtLeast(request.user, USER_ROLES.admin) ? 'admin' : 'user';

const attachLocalUser = (request: Request, user: User): User => {
  if (request.user) {
    request.user.sub = user.id;
  }

  return user;
};

export const resolveLocalUser = async (request: Request): Promise<User> => {
  if (!request.user) {
    throw new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated');
  }

  const { subjectId } = request.user;
  const existing = await prisma.user.findUnique({ where: { subjectId } });
  if (existing) {
    return attachLocalUser(request, existing);
  }

  const profile = profileFromUserInfo(subjectId, await fetchUserInfo(request));
  const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });

  if (existingByEmail) {
    const username = await getUniqueUsername(profile.username, subjectId, existingByEmail.id);
    const updated = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        subjectId,
        username,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: mapAuthRoleToDbRole(request),
      },
    });

    return attachLocalUser(request, updated);
  }

  const username = await getUniqueUsername(profile.username, subjectId);
  const created = await prisma.user.create({
    data: {
      subjectId,
      username,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: mapAuthRoleToDbRole(request),
    },
  });

  return attachLocalUser(request, created);
};

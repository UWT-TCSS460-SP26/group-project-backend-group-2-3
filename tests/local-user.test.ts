import { Request } from 'express';
import { resolveLocalUser } from '../src/services/local-user';
import { prisma } from '../src/lib/prisma';
import { USER_ROLES } from '../src/types/auth';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const originalFetch = global.fetch;

const buildRequest = (subjectId = 'auth2|subject-1'): Request =>
  ({
    headers: {
      authorization: 'Bearer userinfo-token',
    },
    user: {
      sub: 0,
      subjectId,
      email: 'token@example.test',
      role: USER_ROLES.user,
    },
  }) as Request;

describe('resolveLocalUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.AUTH_ISSUER = 'https://auth.example.test/';
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('reuses an existing local user without calling Auth2 userinfo', async () => {
    const request = buildRequest();
    const existingUser = {
      id: 12,
      subjectId: 'auth2|subject-1',
      username: 'existing',
      email: 'existing@example.test',
      firstName: null,
      lastName: null,
      role: 'user',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    mockFindUnique.mockResolvedValueOnce(existingUser);

    const user = await resolveLocalUser(request);

    expect(user).toBe(existingUser);
    expect(request.user?.sub).toBe(12);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('calls Auth2 userinfo once and creates a local user when subject is missing', async () => {
    const request = buildRequest();
    const createdUser = {
      id: 25,
      subjectId: 'auth2|subject-1',
      username: 'sprint-user',
      email: 'sprint-user@example.test',
      firstName: 'Sprint',
      lastName: 'User',
      role: 'user',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(createdUser);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'auth2|subject-1',
        username: 'Sprint User',
        email: 'sprint-user@example.test',
        given_name: 'Sprint',
        family_name: 'User',
      }),
    });

    const user = await resolveLocalUser(request);

    expect(user).toBe(createdUser);
    expect(request.user?.sub).toBe(25);
    expect(global.fetch).toHaveBeenCalledWith('https://auth.example.test/v2/oauth/userinfo', {
      headers: {
        accept: 'application/json',
        authorization: 'Bearer userinfo-token',
      },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        subjectId: 'auth2|subject-1',
        username: 'sprint-user',
        email: 'sprint-user@example.test',
        firstName: 'Sprint',
        lastName: 'User',
        role: 'user',
      },
    });
  });

  it('links a legacy local user by matching userinfo email', async () => {
    const request = buildRequest('auth2|admin-subject');
    request.user = {
      sub: 0,
      subjectId: 'auth2|admin-subject',
      email: 'admin@example.test',
      role: USER_ROLES.admin,
    };
    const legacyUser = {
      id: 3,
      subjectId: 'legacy-user-3',
      username: 'admin',
      email: 'admin@example.test',
    };
    const updatedUser = {
      ...legacyUser,
      subjectId: 'auth2|admin-subject',
      firstName: 'Admin',
      lastName: 'Person',
      role: 'admin',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacyUser)
      .mockResolvedValueOnce(legacyUser);
    mockUpdate.mockResolvedValueOnce(updatedUser);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sub: 'auth2|admin-subject',
        preferred_username: 'admin',
        email: 'admin@example.test',
        firstName: 'Admin',
        lastName: 'Person',
      }),
    });

    const user = await resolveLocalUser(request);

    expect(user).toBe(updatedUser);
    expect(request.user?.sub).toBe(3);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        subjectId: 'auth2|admin-subject',
        username: 'admin',
        email: 'admin@example.test',
        firstName: 'Admin',
        lastName: 'Person',
        role: 'admin',
      },
    });
  });
});

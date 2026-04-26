import { HttpError } from '../src/errors/http-error';
import { HTTP_STATUS } from '../src/types/api';
import { AuthenticatedUser, USER_ROLES } from '../src/types/auth';
import { assertOwner, assertOwnerOrAdmin } from '../src/utils/authorization';

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub: 1,
  email: 'user@example.test',
  role: USER_ROLES.user,
  ...overrides,
});

describe('authorization helpers', () => {
  it('allows owners', () => {
    expect(assertOwner(user(), 1)).toEqual(user());
  });

  it('rejects non-owners with 403', () => {
    expect(() => assertOwner(user(), 2)).toThrow(HttpError);

    try {
      assertOwner(user(), 2);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(HTTP_STATUS.forbidden);
    }
  });

  it('allows admins for owner-or-admin checks', () => {
    const admin = user({ role: USER_ROLES.admin });

    expect(assertOwnerOrAdmin(admin, 2)).toEqual(admin);
  });

  it('rejects missing users with 401', () => {
    try {
      assertOwnerOrAdmin(undefined, 1);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(HTTP_STATUS.unauthorized);
    }
  });
});

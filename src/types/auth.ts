export const USER_ROLES = {
  user: 'user',
  admin: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface AuthenticatedUser {
  sub: number;
  email: string;
  role: UserRole;
}

export const isUserRole = (value: unknown): value is UserRole =>
  value === USER_ROLES.user || value === USER_ROLES.admin;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

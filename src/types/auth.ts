export const USER_ROLES = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
  superAdmin: 'SuperAdmin',
  owner: 'Owner',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface AuthenticatedUser {
  sub: number;
  subjectId: string;
  email?: string;
  role: UserRole;
}

const USER_ROLE_VALUES = Object.values(USER_ROLES) as UserRole[];

const ROLE_ALIASES: Record<string, UserRole> = {
  user: USER_ROLES.user,
  moderator: USER_ROLES.moderator,
  admin: USER_ROLES.admin,
  superadmin: USER_ROLES.superAdmin,
  super_admin: USER_ROLES.superAdmin,
  owner: USER_ROLES.owner,
};

export const normalizeUserRole = (value: unknown): UserRole | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return ROLE_ALIASES[value.trim().replace(/\s+/g, '').toLowerCase()] ?? null;
};

export const isUserRole = (value: unknown): value is UserRole =>
  USER_ROLE_VALUES.includes(value as UserRole);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

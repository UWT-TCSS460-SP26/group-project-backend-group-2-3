import { UserRole as PrismaUserRole } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';
import { prisma } from '../lib/prisma';
import { HTTP_STATUS } from '../types/api';

const LOCAL_ROLE_RANK: Record<PrismaUserRole, number> = {
  user: 1,
  admin: 2,
};

export const requireLocalRole = (requiredRole: PrismaUserRole) => {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    if (!request.user) {
      next(new HttpError(HTTP_STATUS.unauthorized, 'Not authenticated'));
      return;
    }

    const subjectId = request.user.subjectId?.trim();
    if (!subjectId) {
      next(new HttpError(HTTP_STATUS.unauthorized, 'Token subject is missing'));
      return;
    }

    try {
      const localUser = await prisma.user.findUnique({
        where: { subjectId },
        select: { id: true, role: true },
      });

      if (!localUser) {
        next(new HttpError(HTTP_STATUS.forbidden, 'Insufficient permissions'));
        return;
      }

      request.user.sub = localUser.id;

      if (LOCAL_ROLE_RANK[localUser.role] < LOCAL_ROLE_RANK[requiredRole]) {
        next(new HttpError(HTTP_STATUS.forbidden, 'Insufficient permissions'));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

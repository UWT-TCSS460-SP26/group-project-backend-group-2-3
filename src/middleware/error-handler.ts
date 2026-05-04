import { Request, Response, NextFunction } from 'express';
import { mapErrorToApiResponse } from '../errors/error-mapper';

export const errorHandler = (
  err: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  const mappedError = mapErrorToApiResponse(err);
  response.status(mappedError.statusCode).json(mappedError.body);
};

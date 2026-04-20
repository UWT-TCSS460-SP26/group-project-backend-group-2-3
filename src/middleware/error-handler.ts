import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http-error';
import { ApiErrorResponse } from '../types/media';

export const errorHandler = (
  err: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  if (err instanceof HttpError) {
    response.status(err.statusCode).json({
      error: err.message,
    } as ApiErrorResponse);
    return;
  }

  // Unexpected error — return 502 with generic message
  response.status(502).json({
    error: 'Internal server error',
  } as ApiErrorResponse);
};

import { ApiErrorResponse, HTTP_STATUS, HttpStatusCode } from '../types/api';
import { HttpError } from './http-error';

export interface MappedApiError {
  statusCode: HttpStatusCode;
  body: ApiErrorResponse;
}

const EXPECTED_ERROR_MESSAGES = {
  [HTTP_STATUS.badRequest]: 'Bad request',
  [HTTP_STATUS.unauthorized]: 'Unauthorized',
  [HTTP_STATUS.forbidden]: 'Forbidden',
  [HTTP_STATUS.notFound]: 'Not found',
  [HTTP_STATUS.conflict]: 'Conflict',
} as const;

export const createApiErrorResponse = (message: string): ApiErrorResponse => ({
  error: message,
});

export const createExpectedApiError = (
  statusCode: keyof typeof EXPECTED_ERROR_MESSAGES,
  message = EXPECTED_ERROR_MESSAGES[statusCode]
): MappedApiError => ({
  statusCode,
  body: createApiErrorResponse(message),
});

export const mapErrorToApiResponse = (error: unknown): MappedApiError => {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      body: createApiErrorResponse(error.message),
    };
  }

  return {
    statusCode: HTTP_STATUS.badGateway,
    body: createApiErrorResponse('Internal server error'),
  };
};

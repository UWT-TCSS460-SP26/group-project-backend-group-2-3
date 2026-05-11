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

const isJsonParseError = (error: unknown): boolean => {
  if (!(error instanceof SyntaxError) || typeof error !== 'object' || error === null) {
    return false;
  }

  const { status, statusCode, type } = error as {
    status?: unknown;
    statusCode?: unknown;
    type?: unknown;
  };

  return (
    (status === HTTP_STATUS.badRequest || statusCode === HTTP_STATUS.badRequest) &&
    type === 'entity.parse.failed'
  );
};

export const mapErrorToApiResponse = (error: unknown): MappedApiError => {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      body: createApiErrorResponse(error.message),
    };
  }

  if (isJsonParseError(error)) {
    return {
      statusCode: HTTP_STATUS.badRequest,
      body: createApiErrorResponse('Invalid JSON body'),
    };
  }

  return {
    statusCode: HTTP_STATUS.badGateway,
    body: createApiErrorResponse('Internal server error'),
  };
};

export interface ApiErrorResponse {
  error: string;
}

export const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  internalServerError: 500,
  badGateway: 502,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export type ExpectedErrorStatusCode =
  | typeof HTTP_STATUS.badRequest
  | typeof HTTP_STATUS.unauthorized
  | typeof HTTP_STATUS.forbidden
  | typeof HTTP_STATUS.notFound
  | typeof HTTP_STATUS.conflict;

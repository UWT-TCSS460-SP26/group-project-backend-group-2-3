import { MediaType } from '@prisma/client';
import { HttpError } from '../errors/http-error';
import { HTTP_STATUS } from '../types/api';
import {
  parseOptionalPositiveIntegerFilter,
  parseOptionalPositiveIntegerQueryWithDefault,
} from './validation';

/**
 * Shared request parsing helpers for Sprint 2+ routes.
 *
 * Contract:
 * - These helpers throw `HttpError(400, <message>)` for invalid inputs.
 * - The global error handler maps `HttpError` to `{ error: <message> }`.
 * - Query params may be provided as a string or a string[]; we always use the first value.
 *
 * Error messages are intentionally stable so route handlers don't re-invent validation text.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const getSingleQueryValue = (rawValue: unknown): unknown =>
  Array.isArray(rawValue) ? rawValue[0] : rawValue;

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export const parsePaginationQuery = (query: Record<string, unknown>): PaginationParams => {
  const page = parseOptionalPositiveIntegerQueryWithDefault(
    query.page,
    DEFAULT_PAGE,
    'Query parameter page must be a positive integer'
  );
  const pageSize = parseOptionalPositiveIntegerQueryWithDefault(
    query.pageSize,
    DEFAULT_PAGE_SIZE,
    'Query parameter pageSize must be a positive integer'
  );

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      `Query parameter pageSize must be ${MAX_PAGE_SIZE} or less`
    );
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

const isMediaType = (value: unknown): value is MediaType => value === 'movie' || value === 'show';

export const parseOptionalMediaTypeQuery = (rawValue: unknown): MediaType | undefined => {
  const value = getSingleQueryValue(rawValue);
  if (value === undefined) {
    return undefined;
  }

  if (!isMediaType(value)) {
    throw new HttpError(
      HTTP_STATUS.badRequest,
      'Query parameter mediaType must be either movie or show'
    );
  }

  return value;
};

export interface MediaTargetFilters {
  tmdbId?: number;
  mediaType?: MediaType;
}

export const parseMediaTargetFilters = (query: Record<string, unknown>): MediaTargetFilters => {
  const tmdbId = parseOptionalPositiveIntegerFilter(
    query.tmdbId,
    'Query parameter tmdbId must be a positive integer'
  );
  const mediaType = parseOptionalMediaTypeQuery(query.mediaType);

  return {
    ...(tmdbId !== undefined ? { tmdbId } : {}),
    ...(mediaType !== undefined ? { mediaType } : {}),
  };
};

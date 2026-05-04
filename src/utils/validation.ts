import { HttpError } from '../errors/http-error';

const getSingleValue = (rawValue: unknown): unknown =>
  Array.isArray(rawValue) ? rawValue[0] : rawValue;

export const parsePositiveInteger = (rawValue: string): number | null => {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== rawValue) {
    return null;
  }

  return parsed;
};

export const parseRequiredQueryString = (rawValue: unknown, missingMessage: string): string => {
  const value = getSingleValue(rawValue);
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, missingMessage);
  }

  return value.trim();
};

export const parseOptionalPositiveIntegerQuery = (
  rawValue: unknown,
  invalidMessage: string
): number => {
  const value = getSingleValue(rawValue);

  if (value === undefined) {
    return 1;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, invalidMessage);
  }

  const parsed = parsePositiveInteger(value);
  if (parsed === null) {
    throw new HttpError(400, invalidMessage);
  }

  return parsed;
};

export const parsePositiveIntegerPathParam = (rawValue: unknown): number | null => {
  const value = getSingleValue(rawValue);
  if (typeof value !== 'string') {
    return null;
  }

  return parsePositiveInteger(value);
};

/**
 * Parses a required JSON body field that must be a positive integer.
 *
 * Contract:
 * - Accepts numbers only (not numeric strings).
 * - Throws `HttpError(400, invalidMessage)` when invalid.
 */
export const parseRequiredPositiveIntegerField = (
  rawValue: unknown,
  invalidMessage: string
): number => {
  if (typeof rawValue !== 'number' || !Number.isInteger(rawValue) || rawValue <= 0) {
    throw new HttpError(400, invalidMessage);
  }

  return rawValue;
};

/**
 * Parses an optional positive-integer query string, returning a default when omitted.
 *
 * Contract:
 * - Accepts "1", "2", ... (no decimals, no leading/trailing spaces).
 * - Throws `HttpError(400, invalidMessage)` when present but invalid.
 */
export const parseOptionalPositiveIntegerQueryWithDefault = (
  rawValue: unknown,
  defaultValue: number,
  invalidMessage: string
): number => {
  const value = getSingleValue(rawValue);

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, invalidMessage);
  }

  const parsed = parsePositiveInteger(value);
  if (parsed === null) {
    throw new HttpError(400, invalidMessage);
  }

  return parsed;
};

/**
 * Parses an optional positive-integer query string used as a filter (e.g. tmdbId, userId).
 *
 * Contract:
 * - Returns `undefined` when omitted.
 * - Throws `HttpError(400, invalidMessage)` when present but invalid.
 */
export const parseOptionalPositiveIntegerFilter = (
  rawValue: unknown,
  invalidMessage: string
): number | undefined => {
  const value = getSingleValue(rawValue);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, invalidMessage);
  }

  const parsed = parsePositiveInteger(value);
  if (parsed === null) {
    throw new HttpError(400, invalidMessage);
  }

  return parsed;
};

export const parseRequiredStringField = (rawValue: unknown, fieldName: string): string => {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    throw new HttpError(400, `${fieldName} is required`);
  }

  return rawValue.trim();
};

export const parseOptionalStringField = (
  rawValue: unknown,
  fieldName: string
): string | undefined => {
  if (rawValue === undefined || rawValue === null) return undefined;
  if (typeof rawValue !== 'string') {
    throw new HttpError(400, `${fieldName} must be a string`);
  }

  return rawValue.trim() || undefined;
};

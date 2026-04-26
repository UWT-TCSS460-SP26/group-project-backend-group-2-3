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

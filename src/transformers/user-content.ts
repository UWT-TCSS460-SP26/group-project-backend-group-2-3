import { MediaType } from '@prisma/client';

/**
 * Review and rating API responses embed a consistent **`author`** object so public feeds read naturally
 * (for example “by @alice”) without a separate user-profile round-trip.
 *
 * ## Canonical author shape
 *
 * Every review and rating payload includes:
 *
 * `author: { id: number, username: string }`
 *
 * The `username` field is the **display label** returned to clients. It is derived from stored user fields
 * using the fallback rules below, and is not guaranteed to equal the raw `User.username` column when that
 * value is blank or whitespace-only.
 *
 * ## Missing display-name fallback
 *
 * Applied in order when building `author.username`:
 *
 * 1. If `User.username` is non-empty after trimming, use it.
 * 2. Else if a trimmed concatenation of `firstName` and `lastName` is non-empty (single space between parts),
 *    use that full name.
 * 3. Else use `'user-'` followed by the first eight characters of `User.subjectId` (external identity subject).
 *
 * ## Aggregate discovery feeds
 *
 * Endpoints such as `GET /v1/discover/top-rated` return title-level rollups (`averageScore`, `ratingCount`,
 * TMDB metadata). They do **not** embed individual rating rows or `author` objects; that is intentional.
 */

/** Fields loaded for every rating/review row so {@link toUserContentAuthorResponse} can apply fallbacks. */
export interface UserContentAuthorSource {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  subjectId: string;
}

/**
 * Public author surface on review and rating responses (`author.username` is the resolved display string).
 */
export interface UserContentAuthorResponse {
  id: number;
  username: string;
}

export interface UserContentRecordBase {
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  createdAt: Date;
  updatedAt: Date;
  user: UserContentAuthorSource;
}

export interface RatingRecordWithAuthor extends UserContentRecordBase {
  score: number;
}

export interface ReviewRecordWithAuthor extends UserContentRecordBase {
  title: string | null;
  body: string;
}

export interface RatingResponse {
  id: number;
  mediaType: MediaType;
  score: number;
  createdAt: string;
  updatedAt: string;
  author: UserContentAuthorResponse;
}

export interface ReviewResponse {
  id: number;
  mediaType: MediaType;
  title: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: UserContentAuthorResponse;
}

export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface PaginationResponseInput<T> {
  page: number;
  pageSize: number;
  totalResults: number;
  results: T[];
}

export const userContentAuthorInclude = {
  user: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      subjectId: true,
    },
  },
} as const;

const trimStr = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * Resolves the display string exposed as `author.username` on review and rating responses.
 * See the module JSDoc for the full fallback chain.
 */
export const resolveUserContentAuthorDisplayName = (
  user: Pick<UserContentAuthorSource, 'username' | 'firstName' | 'lastName' | 'subjectId'>
): string => {
  const fromUsername = trimStr(user.username);
  if (fromUsername) {
    return fromUsername;
  }

  const fullName = [trimStr(user.firstName), trimStr(user.lastName)].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }

  return `user-${user.subjectId.slice(0, 8)}`;
};

export const toUserContentAuthorResponse = (user: UserContentAuthorSource): UserContentAuthorResponse => ({
  id: user.id,
  username: resolveUserContentAuthorDisplayName(user),
});

export const toRatingResponse = (rating: RatingRecordWithAuthor): RatingResponse => ({
  id: rating.id,
  mediaType: rating.mediaType,
  score: rating.score,
  createdAt: rating.createdAt.toISOString(),
  updatedAt: rating.updatedAt.toISOString(),
  author: toUserContentAuthorResponse(rating.user),
});

export const toReviewResponse = (review: ReviewRecordWithAuthor): ReviewResponse => ({
  id: review.id,
  mediaType: review.mediaType,
  title: review.title,
  body: review.body,
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
  author: toUserContentAuthorResponse(review.user),
});

export const toPaginatedResponse = <T>({
  page,
  pageSize,
  totalResults,
  results,
}: PaginationResponseInput<T>): PaginatedResponse<T> => ({
  page,
  pageSize,
  totalPages: Math.ceil(totalResults / pageSize),
  totalResults,
  results,
});

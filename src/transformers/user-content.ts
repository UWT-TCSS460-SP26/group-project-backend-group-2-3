import { MediaType } from '@prisma/client';

export interface UserContentAuthorRecord {
  id: number;
  username: string;
}

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
  user: UserContentAuthorRecord;
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
    },
  },
} as const;

export const toUserContentAuthorResponse = (
  author: UserContentAuthorRecord
): UserContentAuthorResponse => ({
  id: author.id,
  username: author.username,
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

import {
  RatingRecordWithAuthor,
  RatingResponse,
  ReviewRecordWithAuthor,
  ReviewResponse,
  UserContentAuthorRecord,
} from '../../src/transformers/user-content';

type AuthorOverrides = Partial<UserContentAuthorRecord>;
type RatingRecordOverrides = Partial<Omit<RatingRecordWithAuthor, 'user'>> & {
  user?: AuthorOverrides;
};
type ReviewRecordOverrides = Partial<Omit<ReviewRecordWithAuthor, 'user'>> & {
  user?: AuthorOverrides;
};

export const USER_CONTENT_TEST_TMDB_IDS = [910001, 910002, 910003, 910004, 910005, 910006];

export const USER_CONTENT_TEST_IDENTITIES = {
  reviewOwner: {
    username: 'reviews-int-owner',
    email: 'reviews-int-owner@example.test',
  },
  reviewOther: {
    username: 'reviews-int-other',
    email: 'reviews-int-other@example.test',
  },
} as const;

export const buildUserContentAuthor = (
  overrides: AuthorOverrides = {}
): UserContentAuthorRecord => ({
  id: 1,
  username: 'alice',
  ...overrides,
});

export const buildRatingRecord = (
  overrides: RatingRecordOverrides = {}
): RatingRecordWithAuthor => ({
  id: 1,
  tmdbId: 550,
  mediaType: 'movie',
  score: 8,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
  user: buildUserContentAuthor(overrides.user),
});

export const buildRatingResponse = (overrides: RatingRecordOverrides = {}): RatingResponse => {
  const record = buildRatingRecord(overrides);

  return {
    id: record.id,
    mediaType: record.mediaType,
    score: record.score,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    author: buildUserContentAuthor(record.user),
  };
};

export const buildReviewRecord = (
  overrides: ReviewRecordOverrides = {}
): ReviewRecordWithAuthor => ({
  id: 101,
  tmdbId: 550,
  mediaType: 'movie',
  title: 'Great watch',
  body: 'This movie stayed sharp, focused, and worth revisiting.',
  createdAt: new Date('2026-04-26T18:30:00.000Z'),
  updatedAt: new Date('2026-04-26T18:30:00.000Z'),
  ...overrides,
  user: buildUserContentAuthor({
    username: USER_CONTENT_TEST_IDENTITIES.reviewOwner.username,
    ...overrides.user,
  }),
});

export const buildReviewResponse = (overrides: ReviewRecordOverrides = {}): ReviewResponse => {
  const record = buildReviewRecord(overrides);

  return {
    id: record.id,
    mediaType: record.mediaType,
    title: record.title,
    body: record.body,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    author: buildUserContentAuthor(record.user),
  };
};

export const buildReviewCreatePayload = (
  overrides: Partial<Pick<ReviewRecordWithAuthor, 'tmdbId' | 'mediaType' | 'title' | 'body'>> = {}
) => ({
  tmdbId: 910001,
  mediaType: 'movie',
  title: 'Great watch',
  body: 'This movie stayed sharp, focused, and worth revisiting.',
  ...overrides,
});

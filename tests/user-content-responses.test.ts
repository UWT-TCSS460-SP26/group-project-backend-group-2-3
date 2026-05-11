import {
  resolveUserContentAuthorDisplayName,
  toPaginatedResponse,
  toRatingResponse,
  toReviewResponse,
} from '../src/transformers/user-content';
import {
  buildRatingRecord,
  buildRatingResponse,
  buildReviewRecord,
  buildReviewResponse,
} from './support/user-content-fixtures';

describe('shared user content response mappers', () => {
  it('maps rating records to the public rating contract', () => {
    expect(toRatingResponse(buildRatingRecord())).toEqual(buildRatingResponse());
  });

  it('maps review records to the public review contract', () => {
    expect(toReviewResponse(buildReviewRecord())).toEqual(buildReviewResponse());
  });

  it('exposes author { id, username } on rating and review responses', () => {
    const rating = toRatingResponse(buildRatingRecord());
    expect(rating.author).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        username: expect.any(String),
      })
    );
    expect(rating.author.username.length).toBeGreaterThan(0);

    const review = toReviewResponse(buildReviewRecord());
    expect(review.author).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        username: expect.any(String),
      })
    );
    expect(review.author.username.length).toBeGreaterThan(0);
  });

  describe('resolveUserContentAuthorDisplayName', () => {
    it('uses trimmed username when present', () => {
      expect(
        resolveUserContentAuthorDisplayName({
          username: '  alice  ',
          firstName: 'Ignored',
          lastName: 'Ignored',
          subjectId: 'sub',
        })
      ).toBe('alice');
    });

    it('falls back to first and last name when username is blank', () => {
      expect(
        resolveUserContentAuthorDisplayName({
          username: '   ',
          firstName: 'Ada',
          lastName: 'Lovelace',
          subjectId: 'auth0|ignored',
        })
      ).toBe('Ada Lovelace');
    });

    it('falls back to first name only when last name is empty', () => {
      expect(
        resolveUserContentAuthorDisplayName({
          username: '',
          firstName: 'Taylor',
          lastName: null,
          subjectId: 'auth0|ignored',
        })
      ).toBe('Taylor');
    });

    it('uses user- + first 8 chars of subjectId when username and name are empty', () => {
      expect(
        resolveUserContentAuthorDisplayName({
          username: '',
          firstName: null,
          lastName: '  ',
          subjectId: 'auth0|abcdefghijklmnop',
        })
      ).toBe('user-auth0|ab');
    });
  });

  it('builds consistent paginated list wrappers', () => {
    expect(
      toPaginatedResponse({
        page: 2,
        pageSize: 5,
        totalResults: 11,
        results: ['row'],
      })
    ).toEqual({
      page: 2,
      pageSize: 5,
      totalPages: 3,
      totalResults: 11,
      results: ['row'],
    });
  });
});

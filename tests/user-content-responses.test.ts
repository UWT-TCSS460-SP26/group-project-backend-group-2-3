import {
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

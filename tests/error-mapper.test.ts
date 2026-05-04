import { mapErrorToApiResponse } from '../src/errors/error-mapper';
import { HttpError } from '../src/errors/http-error';
import { HTTP_STATUS } from '../src/types/api';

describe('mapErrorToApiResponse', () => {
  it('maps expected HttpError statuses to a standard error payload', () => {
    const mapped = mapErrorToApiResponse(new HttpError(HTTP_STATUS.conflict, 'Duplicate rating'));

    expect(mapped).toEqual({
      statusCode: HTTP_STATUS.conflict,
      body: { error: 'Duplicate rating' },
    });
  });

  it('maps unexpected errors to the existing generic upstream response', () => {
    const mapped = mapErrorToApiResponse(new Error('database disconnected'));

    expect(mapped).toEqual({
      statusCode: HTTP_STATUS.badGateway,
      body: { error: 'Internal server error' },
    });
  });
});

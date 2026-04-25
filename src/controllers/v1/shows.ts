import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../errors/http-error';
import { tmdbClient } from '../../services/tmdb-client';
import { mapTmdbShowDetailsToShowDetail } from '../../utils/map-tmdb-show-details';
import {
  parseOptionalPositiveIntegerQuery,
  parsePositiveIntegerPathParam,
  parseRequiredQueryString,
} from '../../utils/validation';
import { mapTmdbShowListItems } from '../../transformers/show-list';

export const searchShows = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const searchQuery = parseRequiredQueryString(request.query.q, 'q is required');
    const page = parseOptionalPositiveIntegerQuery(
      request.query.page,
      'page must be a positive integer'
    );

    const tmdbResponse = await tmdbClient.searchShows(searchQuery, page);

    response.json({
      page: tmdbResponse.page,
      totalPages: tmdbResponse.total_pages,
      totalResults: tmdbResponse.total_results,
      results: mapTmdbShowListItems(tmdbResponse.results),
    });
  } catch (error) {
    next(error);
  }
};

export const getPopularShows = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseOptionalPositiveIntegerQuery(
      request.query.page,
      'page must be a positive integer'
    );

    const tmdbResponse = await tmdbClient.getPopularShows(page);

    response.json({
      page: tmdbResponse.page,
      totalPages: tmdbResponse.total_pages,
      totalResults: tmdbResponse.total_results,
      results: mapTmdbShowListItems(tmdbResponse.results),
    });
  } catch (error) {
    next(error);
  }
};

export const getShowDetails = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const showId = parsePositiveIntegerPathParam(request.params.id);
  if (showId === null) {
    next(new HttpError(404, 'Show not found'));
    return;
  }

  try {
    const tmdbShow = await tmdbClient.getShowDetails(showId);
    response.status(200).json(mapTmdbShowDetailsToShowDetail(tmdbShow));
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(502, 'TMDB request failed'));
  }
};

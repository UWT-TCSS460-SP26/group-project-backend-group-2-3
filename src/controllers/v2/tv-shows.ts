import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../errors/http-error';
import { tmdbClient } from '../../services/tmdb-client';
import { mapTmdbShowDetailsToShowDetail } from '../../utils/map-tmdb-show-details';
import { mapTmdbShowListItems } from '../../transformers/show-list';
import {
  parseOptionalPositiveIntegerQuery,
  parsePositiveIntegerPathParam,
  parseRequiredQueryString,
} from '../../utils/validation';

export const searchTvShows = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const searchTitle = parseRequiredQueryString(request.query.title, 'title is required');
    const page = parseOptionalPositiveIntegerQuery(
      request.query.page,
      'page must be a positive integer'
    );

    const tmdbResponse = await tmdbClient.searchShows(searchTitle, page);

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

export const getPopularTvShows = async (
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

export const tvShowDetails = async (
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

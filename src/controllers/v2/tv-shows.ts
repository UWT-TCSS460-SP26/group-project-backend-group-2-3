import { Request, Response, NextFunction } from 'express';
import { tmdbClient } from '../../services/tmdb-client';
import { mapTmdbShowListItems } from '../../transformers/show-list';
import { parseOptionalPositiveIntegerQuery, parseRequiredQueryString } from '../../utils/validation';

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

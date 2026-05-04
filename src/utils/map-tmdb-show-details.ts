import { getTmdbConfig } from '../config/env';
import { MediaDetailCommunity, ShowDetailResponse, TmdbShowDetails } from '../types/media';
import { extractYear } from './extract-year';
import { buildTmdbImageUrl } from './tmdb-image';

export const mapTmdbShowDetailsToShowDetail = (
  show: TmdbShowDetails,
  community: MediaDetailCommunity
): ShowDetailResponse => {
  const { imageBaseUrl } = getTmdbConfig();

  return {
    backdropUrl: buildTmdbImageUrl(imageBaseUrl, show.backdrop_path, 'w780'),
    episodeCount: show.number_of_episodes,
    genres: show.genres.map((genre) => genre.name),
    id: show.id,
    overview: show.overview,
    posterUrl: buildTmdbImageUrl(imageBaseUrl, show.poster_path, 'w500'),
    rating: show.vote_average,
    seasonCount: show.number_of_seasons,
    status: show.status,
    title: show.name,
    year: extractYear(show.first_air_date),
    community,
  };
};

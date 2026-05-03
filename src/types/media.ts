import type { ReviewResponse } from '../transformers/user-content';

export type MediaType = 'movie' | 'show';

/** Community ratings and reviews on a media detail response (shared by movie and TV detail routes). */
export interface MediaDetailCommunity {
  averageScore: number | null;
  ratingCount: number;
  reviewCount: number;
  recentReviews: ReviewResponse[];
}

export interface MediaListItem {
  id: number;
  mediaType: MediaType;
  overview: string;
  posterUrl: string | null;
  title: string;
  year: number | null;
}

export interface MediaListResponse {
  page: number;
  results: MediaListItem[];
  totalPages: number;
  totalResults: number;
}

export interface MovieDetailResponse {
  backdropUrl: string | null;
  genres: string[];
  id: number;
  overview: string;
  posterUrl: string | null;
  rating: number;
  runtimeMinutes: number | null;
  status: string;
  title: string;
  year: number | null;
}

export interface ShowDetailResponse {
  backdropUrl: string | null;
  episodeCount: number;
  genres: string[];
  id: number;
  overview: string;
  posterUrl: string | null;
  rating: number;
  seasonCount: number;
  status: string;
  title: string;
  year: number | null;
  community: MediaDetailCommunity;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieListResult {
  id: number;
  overview: string;
  poster_path: string | null;
  release_date?: string | null;
  title: string;
}

export interface TmdbShowListResult {
  first_air_date?: string | null;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
}

export interface TmdbMovieDetails {
  backdrop_path: string | null;
  genres: TmdbGenre[];
  id: number;
  overview: string;
  poster_path: string | null;
  release_date?: string | null;
  runtime?: number | null;
  status: string;
  title: string;
  vote_average: number;
}

export interface TmdbShowDetails {
  backdrop_path: string | null;
  first_air_date?: string | null;
  genres: TmdbGenre[];
  id: number;
  name: string;
  number_of_episodes: number;
  number_of_seasons: number;
  overview: string;
  poster_path: string | null;
  status: string;
  vote_average: number;
}

export interface TmdbErrorResponse {
  status_code?: number;
  status_message?: string;
  success?: boolean;
}

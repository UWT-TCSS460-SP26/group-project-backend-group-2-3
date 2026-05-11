import { mapTmdbShowDetailsToShowDetail } from '../src/utils/map-tmdb-show-details';
import type { MediaDetailCommunity, TmdbShowDetails } from '../src/types/media';

const zeroCommunity: MediaDetailCommunity = {
  averageScore: null,
  ratingCount: 0,
  reviewCount: 0,
  recentReviews: [],
};

describe('mapTmdbShowDetailsToShowDetail', () => {
  const originalTmdbApiKey = process.env.TMDB_API_KEY;

  beforeAll(() => {
    process.env.TMDB_API_KEY = process.env.TMDB_API_KEY ?? 'test-tmdb-api-key';
  });

  afterAll(() => {
    if (originalTmdbApiKey === undefined) {
      delete process.env.TMDB_API_KEY;
      return;
    }

    process.env.TMDB_API_KEY = originalTmdbApiKey;
  });

  it('maps TMDB TV detail fields to ShowDetailResponse', () => {
    const tmdbPayload: TmdbShowDetails = {
      backdrop_path: '/backdrop.jpg',
      first_air_date: '2008-01-20',
      genres: [{ id: 18, name: 'Drama' }],
      id: 1396,
      name: 'Breaking Bad',
      number_of_episodes: 62,
      number_of_seasons: 5,
      overview: 'A high school chemistry teacher turned meth cook.',
      poster_path: '/poster.jpg',
      status: 'Ended',
      vote_average: 8.9,
    };

    expect(mapTmdbShowDetailsToShowDetail(tmdbPayload, zeroCommunity)).toEqual({
      backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
      community: zeroCommunity,
      episodeCount: 62,
      genres: ['Drama'],
      id: 1396,
      overview: 'A high school chemistry teacher turned meth cook.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      rating: 8.9,
      seasonCount: 5,
      status: 'Ended',
      title: 'Breaking Bad',
      year: 2008,
    });
  });

  it('returns null image URLs and year when paths and first air date are missing', () => {
    const tmdbPayload: TmdbShowDetails = {
      backdrop_path: null,
      first_air_date: null,
      genres: [],
      id: 1,
      name: 'TBD',
      number_of_episodes: 0,
      number_of_seasons: 1,
      overview: '',
      poster_path: null,
      status: 'In Production',
      vote_average: 0,
    };

    expect(mapTmdbShowDetailsToShowDetail(tmdbPayload, zeroCommunity)).toMatchObject({
      backdropUrl: null,
      posterUrl: null,
      title: 'TBD',
      year: null,
    });
  });
});

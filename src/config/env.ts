const DEFAULT_PORT = 3000;
const DEFAULT_TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const DEFAULT_TMDB_LANGUAGE = 'en-US';

export interface TmdbConfig {
  apiKey: string;
  baseUrl: string;
  defaultLanguage: string;
  imageBaseUrl: string;
}

const readEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const readRequiredEnv = (name: string): string => {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`${name} is required to call TMDB`);
  }

  return value;
};

export const getPort = (): number => {
  const rawPort = readEnv('PORT');
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(rawPort, 10);
  return Number.isNaN(port) ? DEFAULT_PORT : port;
};

export const getTmdbConfig = (): TmdbConfig => ({
  apiKey: readRequiredEnv('TMDB_API_KEY'),
  baseUrl: readEnv('TMDB_BASE_URL') ?? DEFAULT_TMDB_BASE_URL,
  defaultLanguage: readEnv('TMDB_LANGUAGE') ?? DEFAULT_TMDB_LANGUAGE,
  imageBaseUrl: readEnv('TMDB_IMAGE_BASE_URL') ?? DEFAULT_TMDB_IMAGE_BASE_URL,
});

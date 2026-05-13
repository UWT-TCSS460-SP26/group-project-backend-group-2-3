const defaultTestDatabaseUrl =
  'postgresql://postgres:password@localhost:5433/tcss460?schema=public';

// Keep test DB config deterministic so local .env DATABASE_URL values (for app runtime)
// do not accidentally break the Jest suite.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL?.trim() || defaultTestDatabaseUrl;

process.env.TMDB_API_KEY ??= 'test-tmdb-api-key';
process.env.TMDB_BASE_URL ??= 'https://api.themoviedb.org/3';
process.env.TMDB_IMAGE_BASE_URL ??= 'https://image.tmdb.org/t/p';
process.env.TMDB_LANGUAGE ??= 'en-US';
process.env.AUTH_ISSUER ??= 'https://tcss-460-iam.onrender.com';
process.env.API_AUDIENCE ??= 'group-2-api';

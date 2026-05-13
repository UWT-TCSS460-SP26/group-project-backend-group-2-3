const defaultTestDatabaseUrl =
  'postgresql://postgres:password@localhost:5433/tcss460?schema=public';

// Resolve the Jest DB URL in this order:
// 1) TEST_DATABASE_URL for explicit test targeting
// 2) existing DATABASE_URL (used by CI workflows/services)
// 3) local Docker default fallback
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  defaultTestDatabaseUrl;

process.env.TMDB_API_KEY ??= 'test-tmdb-api-key';
process.env.TMDB_BASE_URL ??= 'https://api.themoviedb.org/3';
process.env.TMDB_IMAGE_BASE_URL ??= 'https://image.tmdb.org/t/p';
process.env.TMDB_LANGUAGE ??= 'en-US';
process.env.AUTH_ISSUER ??= 'https://tcss-460-iam.onrender.com';
process.env.API_AUDIENCE ??= 'group-2-api';

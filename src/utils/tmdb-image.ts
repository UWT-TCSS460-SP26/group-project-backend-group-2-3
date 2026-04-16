export type TmdbImageSize = 'w500' | 'w780';

export const buildTmdbImageUrl = (
  imageBaseUrl: string,
  filePath: string | null | undefined,
  size: TmdbImageSize,
): string | null => {
  if (!filePath) {
    return null;
  }

  const normalizedBaseUrl = imageBaseUrl.replace(/\/+$/, '');
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${normalizedBaseUrl}/${size}${normalizedPath}`;
};

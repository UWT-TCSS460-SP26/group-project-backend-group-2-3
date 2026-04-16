export const extractYear = (dateValue?: string | null): number | null => {
  if (!dateValue) {
    return null;
  }

  const year = Number.parseInt(dateValue.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
};

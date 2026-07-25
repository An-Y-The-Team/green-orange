const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Today in the BROWSER's timezone as `YYYY-MM-DD`.
 *
 * Deliberately not `@/utils/today-iso` — that one goes through `toISOString()`,
 * which is UTC and therefore reports yesterday between 00:00 and 07:00 in
 * Vietnam (UTC+7). The appointment picker must default to the date the user
 * actually sees on their clock, so it reads local parts instead.
 */
export const localDateISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Current local wall-clock time as `HH:mm`, for the appointment time input. */
export const localTimeHHmm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

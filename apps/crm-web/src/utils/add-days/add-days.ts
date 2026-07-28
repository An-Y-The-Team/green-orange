const pad = (n: number) => String(n).padStart(2, "0");

/**
 * `YYYY-MM-DD` + n days → `YYYY-MM-DD`, entirely in local time.
 *
 * Reads the result back with local getters rather than `toISOString()`. The
 * previous version did the latter, which converted the local midnight to UTC and
 * so returned the PREVIOUS day for any timezone ahead of UTC — in Vietnam
 * (UTC+7) every estimated end date was rendered one day early.
 */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

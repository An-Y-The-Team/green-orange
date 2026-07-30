const pad = (n: number) => String(n).padStart(2, "0");

const dateOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Today as a `YYYY-MM-DD` string — the wire format every date column uses.
 * Passed as a lazy `useState` initializer, so it's a function, not a constant.
 *
 * Reads local date parts, not `toISOString()`: the latter is UTC and reports
 * yesterday between 00:00 and 07:00 in Vietnam (UTC+7), so every date input
 * defaulting to "today" opened on the wrong day for early-morning users.
 */
export const todayISO = () => dateOf(new Date());

/**
 * The LOCAL `YYYY-MM-DD` of a full timestamp — for comparing an instant column
 * (`appointment_at`, serialized as UTC ISO) against a date column or `todayISO()`.
 *
 * `iso.startsWith(todayISO())` is the bug this exists to prevent: an appointment
 * at 06:30 ICT is stored `…T23:30:00.000Z` on the PREVIOUS day, so the prefix
 * never matches and the booking vanishes from every "today" list.
 */
export const localDateOf = (iso: string) => dateOf(new Date(iso));

/** Current local wall-clock time as `HH:mm`, for time inputs. */
export const nowHHmm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

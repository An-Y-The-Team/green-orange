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

/**
 * The LOCAL `HH:mm` of a full timestamp — the counterpart of `localDateOf` for
 * a time input. `iso.slice(11, 16)` is the bug it replaces: that reads the UTC
 * clock, so a 06:30 ICT appointment prefilled its form with 23:30.
 */
export const localTimeOf = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Current local wall-clock time as `HH:mm`, for time inputs. */
export const nowHHmm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * A local date + `HH:mm` as a full UTC ISO instant — the wire format every
 * `*_at` column wants, built from what the user actually saw in the two inputs.
 *
 * `new Date("2026-09-07T13:46")` is parsed as LOCAL time (no trailing Z), which
 * is the whole point: the operator picked 13:46 in Vietnam, so the instant sent
 * is 06:46Z. Missing or malformed time falls back to midnight local rather than
 * silently producing an Invalid Date.
 */
export const localISO = (date: string, time?: string) =>
  new Date(
    `${date}T${/^\d{2}:\d{2}/.test(time ?? "") ? time : "00:00"}`
  ).toISOString();

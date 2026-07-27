const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Today as a `YYYY-MM-DD` string — the wire format every date column uses.
 * Passed as a lazy `useState` initializer, so it's a function, not a constant.
 *
 * Reads local date parts, not `toISOString()`: the latter is UTC and reports
 * yesterday between 00:00 and 07:00 in Vietnam (UTC+7), so every date input
 * defaulting to "today" opened on the wrong day for early-morning users.
 */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Current local wall-clock time as `HH:mm`, for time inputs. */
export const nowHHmm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Server-stamped business dates (`*_date` @db.Date columns: acceptance_passed_date,
// decided_date, signed_date, sent_date, paid_date).
//
// `new Date()` is WRONG for these. Prisma truncates DateTime → date in UTC and
// serialize.interceptor.ts reads it back with `toISOString().slice(0, 10)`, so an
// acceptance marked at 00:30 Vietnam time (17:30Z the day before) was stored and
// returned as the PREVIOUS day — on dates that print on documents and drive the
// derived overdue checks.
//
// Fix: resolve the calendar date in the business timezone, then pin it to UTC
// midnight so the interceptor's UTC slice returns that same date. Correct
// regardless of the container's TZ, which is deliberately not relied on.
const BUSINESS_TZ = "Asia/Ho_Chi_Minh";

// 'en-CA' renders as YYYY-MM-DD, which is the wire format for a date column.
const FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ });

/** The business-timezone calendar date of `at`, as `YYYY-MM-DD`. */
export const businessDateString = (at: Date = new Date()): string =>
  FORMATTER.format(at);

/** Today's business date as a Date pinned to UTC midnight — for @db.Date writes. */
export const businessToday = (at: Date = new Date()): Date =>
  new Date(`${businessDateString(at)}T00:00:00.000Z`);

// Vietnam has no DST, so the business day is exactly [+07:00 midnight, +1 day).
const BUSINESS_UTC_OFFSET = "+07:00";

/**
 * Half-open range covering one business calendar day, for filtering a TIMESTAMP
 * column (`appointment_at`) by a local date.
 *
 * A `startsWith`/UTC-slice comparison is the bug this exists to prevent: an
 * appointment at 06:30 ICT is stored `…T23:30:00Z` on the PREVIOUS UTC day, so
 * comparing UTC prefixes drops it from "today" all day. The web app already has
 * `localDateOf` for the read side; this is the query side.
 */
export const businessDayRange = (
  dateString: string
): { gte: Date; lt: Date } => {
  const gte = new Date(`${dateString}T00:00:00.000${BUSINESS_UTC_OFFSET}`);
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
};

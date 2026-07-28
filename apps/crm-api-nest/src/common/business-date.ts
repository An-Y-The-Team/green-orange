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
const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ });

/** The business-timezone calendar date of `at`, as `YYYY-MM-DD`. */
export const businessDateString = (at: Date = new Date()): string =>
  formatter.format(at);

/** Today's business date as a Date pinned to UTC midnight — for @db.Date writes. */
export const businessToday = (at: Date = new Date()): Date =>
  new Date(`${businessDateString(at)}T00:00:00.000Z`);

import { addDays } from "@/utils/add-days/add-days";
import { todayISO } from "@/utils/today-iso/today-iso";

/**
 * An inclusive `YYYY-MM-DD` window — the shape every `?from=&to=` read sends.
 * Lexicographic string compare on `YYYY-MM-DD` is chronological, so nothing
 * here parses a date twice (see `add-days` for why local maths, not UTC).
 */
export type DateRange = { from: string; to: string };

/**
 * Monday of the week containing today (Mon-start weeks), as `YYYY-MM-DD`.
 * `getDay()` is local, matching `todayISO()` — a UTC-based day-of-week would
 * pick the wrong Monday between 00:00 and 07:00 in Vietnam.
 */
export const mondayOfThisWeek = (): string =>
  addDays(todayISO(), -((new Date().getDay() + 6) % 7)); // Sun=0 → 6, Mon=1 → 0

/** The 7 days a weekly grid renders, from its Monday. */
export const weekRange = (weekStart: string): DateRange => ({
  from: weekStart,
  to: addDays(weekStart, 6),
});

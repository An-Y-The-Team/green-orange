import { afterEach, expect, test, vi } from "vitest";

import { isOverdue } from "./is-overdue";

// TZ=Asia/Ho_Chi_Minh comes from vitest.config.ts. isOverdue compares against
// todayISO(), which is the *local* (business) date — under UTC these assertions
// would silently pass for the wrong reason.
afterEach(() => vi.useRealTimers());

// 01:30 on the 25th in Vietnam, still the 24th in UTC. A due date of the 25th
// must NOT be overdue yet: the working day has only just started.
test("the boundary is the business day, not the UTC day", () => {
  vi.setSystemTime(new Date("2026-07-24T18:30:00Z"));
  expect(isOverdue("2026-07-25", false)).toBe(false); // due today
  expect(isOverdue("2026-07-24", false)).toBe(true); // yesterday, ICT
  expect(isOverdue("2026-07-26", false)).toBe(false); // tomorrow
});

test("due exactly today is not overdue, even at 23:59 local", () => {
  vi.setSystemTime(new Date("2026-07-25T16:59:00Z")); // 23:59 ICT, the 25th
  expect(isOverdue("2026-07-25", false)).toBe(false);
  // One minute later it is the 26th in Vietnam and the 25th is past due.
  vi.setSystemTime(new Date("2026-07-25T17:00:00Z")); // 00:00 ICT, the 26th
  expect(isOverdue("2026-07-25", false)).toBe(true);
});

test("done/paid is never overdue, whatever the date", () => {
  vi.setSystemTime(new Date("2026-07-25T03:00:00Z"));
  expect(isOverdue("2020-01-01", true)).toBe(false);
});

test("no due date is never overdue", () => {
  expect(isOverdue(null, false)).toBe(false);
  expect(isOverdue(undefined, false)).toBe(false);
  expect(isOverdue("", false)).toBe(false);
});

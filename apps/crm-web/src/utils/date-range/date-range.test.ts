import { afterEach, expect, test, vi } from "vitest";

import { mondayOfThisWeek, weekRange } from "./date-range";

// TZ=Asia/Ho_Chi_Minh comes from vitest.config.ts — the early-morning cases
// only fail in a UTC+ zone.
afterEach(() => vi.useRealTimers());

// The bug these guard: the weekly chấm công grid now fetches exactly the window
// it renders, so an off-by-one week bound silently loses a day of giờ công.
test("weekRange spans Monday to Sunday across a month boundary", () => {
  expect(weekRange("2026-01-28")).toEqual({
    from: "2026-01-28",
    to: "2026-02-03",
  });
});

test("weekRange spans Monday to Sunday across a year boundary", () => {
  expect(weekRange("2025-12-29")).toEqual({
    from: "2025-12-29",
    to: "2026-01-04",
  });
});

test("mondayOfThisWeek crosses back into the previous year", () => {
  vi.setSystemTime(new Date("2025-12-31T18:00:00Z")); // 01:00 Thu 01/01/2026 ICT
  expect(mondayOfThisWeek()).toBe("2025-12-29");
});

test("mondayOfThisWeek treats Sunday as the end of its week", () => {
  vi.setSystemTime(new Date("2026-02-01T05:00:00Z")); // 12:00 Sun 01/02/2026 ICT
  expect(mondayOfThisWeek()).toBe("2026-01-26");
});

test("mondayOfThisWeek is a no-op on a Monday", () => {
  vi.setSystemTime(new Date("2026-07-27T03:00:00Z")); // 10:00 Mon 27/07/2026 ICT
  expect(mondayOfThisWeek()).toBe("2026-07-27");
});

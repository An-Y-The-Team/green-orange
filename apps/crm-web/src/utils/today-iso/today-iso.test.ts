import { afterEach, expect, test, vi } from "vitest";

import { nowHHmm, todayISO } from "./today-iso";

process.env.TZ = "Asia/Ho_Chi_Minh";

afterEach(() => vi.useRealTimers());

// The bug this guards: toISOString() is UTC, so 01:00 in Vietnam reported
// yesterday and every "today" date input opened on the wrong day.
test("reports the local date, not the UTC one", () => {
  vi.setSystemTime(new Date("2026-07-24T18:30:00Z")); // 01:30 on the 25th, ICT
  expect(todayISO()).toBe("2026-07-25");
  expect(nowHHmm()).toBe("01:30");
});

test("zero-pads month, day, hour and minute", () => {
  vi.setSystemTime(new Date("2026-01-03T01:05:00Z")); // 08:05 on the 3rd, ICT
  expect(todayISO()).toBe("2026-01-03");
  expect(nowHHmm()).toBe("08:05");
});

import { afterEach, expect, test, vi } from "vitest";

import { localDateOf, nowHHmm, todayISO } from "./today-iso";

// TZ=Asia/Ho_Chi_Minh comes from vitest.config.ts — these assertions only fail
// in a UTC+ zone.
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

// The bug this guards: an early-morning appointment is stored on the PREVIOUS
// UTC day, so `appointment_at.startsWith(todayISO())` hid it from "Hôm nay" all
// day. localDateOf must map the instant back to its local calendar date.
test("resolves an instant to its local date, not its UTC date", () => {
  expect(localDateOf("2026-07-27T23:30:00.000Z")).toBe("2026-07-28"); // 06:30 ICT
  expect(localDateOf("2026-07-28T16:59:00.000Z")).toBe("2026-07-28"); // 23:59 ICT
  expect(localDateOf("2026-07-28T17:00:00.000Z")).toBe("2026-07-29"); // 00:00 ICT
});

test("localDateOf agrees with todayISO for the current instant", () => {
  vi.setSystemTime(new Date("2026-07-24T18:30:00Z")); // 01:30 on the 25th, ICT
  expect(localDateOf(new Date().toISOString())).toBe(todayISO());
});

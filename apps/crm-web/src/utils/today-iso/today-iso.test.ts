import { afterEach, expect, test, vi } from "vitest";

import {
  localDateOf,
  localISO,
  localTimeOf,
  nowHHmm,
  todayISO,
} from "./today-iso";

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

// The bug this guards: `new Date(`${d}T${t}`).toISOString()` was written inline
// in three places. It must read the pair as LOCAL time — treating 13:46 as UTC
// would file a Vietnamese afternoon appointment on the wrong side of midnight.
test("assembles a local date + time into a UTC instant", () => {
  expect(localISO("2026-09-07", "13:46")).toBe("2026-09-07T06:46:00.000Z");
  expect(localISO("2026-09-07", "00:30")).toBe("2026-09-06T17:30:00.000Z");
});

test("falls back to local midnight for a missing or malformed time", () => {
  expect(localISO("2026-09-07")).toBe("2026-09-06T17:00:00.000Z");
  expect(localISO("2026-09-07", "")).toBe("2026-09-06T17:00:00.000Z");
  expect(localISO("2026-09-07", "nonsense")).toBe("2026-09-06T17:00:00.000Z");
});

test("round-trips through localDateOf", () => {
  expect(localDateOf(localISO("2026-09-07", "13:46"))).toBe("2026-09-07");
  expect(localDateOf(localISO("2026-09-07", "00:30"))).toBe("2026-09-07");
});

// The bug this guards: `iso.slice(11, 16)` is the UTC clock, so the reschedule
// form prefilled a 06:30 ICT appointment as 23:30 on the previous day.
test("reads the local clock of an instant, not the UTC one", () => {
  expect(localTimeOf("2026-07-27T23:30:00.000Z")).toBe("06:30"); // next day ICT
  expect(localTimeOf("2026-09-07T06:46:00.000Z")).toBe("13:46");
  expect(localDateOf("2026-07-27T23:30:00.000Z")).toBe("2026-07-28");
});

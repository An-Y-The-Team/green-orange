import { expect, test } from "vitest";

import { formatTime } from "./format-time";

// TZ=Asia/Ho_Chi_Minh comes from vitest.config.ts — these assertions only hold
// in a UTC+ zone, which is the point: the bug this replaces was a UTC read.
test("prints the local clock of an instant", () => {
  expect(formatTime("2026-09-07T02:00:00.000Z")).toBe("09:00");
  expect(formatTime("2026-09-07T06:46:00.000Z")).toBe("13:46");
});

// The bug: an early-morning appointment is stored on the previous UTC day, so a
// UTC read printed 23:30 for a 06:30 booking.
test("an early-morning appointment keeps its local time", () => {
  expect(formatTime("2026-07-27T23:30:00.000Z")).toBe("06:30");
});

test("nullable and unparsable input yield an empty string, never 'null'", () => {
  expect(formatTime(null)).toBe("");
  expect(formatTime(undefined)).toBe("");
  expect(formatTime("")).toBe("");
  expect(formatTime("not-a-date")).toBe("");
});

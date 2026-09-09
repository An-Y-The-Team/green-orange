import { expect, test } from "bun:test";

import { computeShiftPreview } from "./compute-shift-preview";

test("computeShiftPreview", () => {
  expect(computeShiftPreview({ start: "07:30", end: "16:30" })).toBe(9);
  expect(computeShiftPreview({ start: "08:00", end: "12:20" })).toBe(4.33);
  expect(computeShiftPreview({ start: "22:00", end: "06:00" })).toBe(8); // qua đêm
  expect(computeShiftPreview({ start: "08:00", end: "08:00" })).toBeNull(); // wraps to 24h, over the cap
  expect(computeShiftPreview({ start: "06:00", end: "23:30" })).toBeNull(); // > 16h
  expect(computeShiftPreview({ start: "", end: "16:30" })).toBeNull(); // cleared input
  expect(computeShiftPreview({ start: "7:30", end: "16:30" })).toBeNull(); // unpadded
  expect(computeShiftPreview({ start: "24:00", end: "16:30" })).toBeNull();
});

import { expect, test } from "vitest";

import { addDays } from "./add-days";

// The bug this guards: reading the result back via toISOString() shifted the
// date backwards in any UTC+ timezone. Run under TZ=Asia/Ho_Chi_Minh to catch it.
test("adding zero days is identity", () => {
  expect(addDays("2026-07-25", 0)).toBe("2026-07-25");
});

test("adds days within a month", () => {
  expect(addDays("2026-07-25", 5)).toBe("2026-07-30");
});

test("rolls over a month boundary", () => {
  expect(addDays("2026-07-30", 5)).toBe("2026-08-04");
});

test("handles a leap day", () => {
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
});

test("rolls over a year boundary", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});

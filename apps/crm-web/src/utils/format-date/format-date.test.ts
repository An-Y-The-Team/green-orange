import { expect, test } from "vitest";

import { formatDate } from "./format-date";

test("ISO date and full ISO timestamp → dd/MM/yyyy", () => {
  expect(formatDate("2026-07-25")).toBe("25/07/2026");
  expect(formatDate("2026-01-03T17:00:00.000Z")).toBe("03/01/2026");
});

// The API returns null for every optional date column; several call sites
// interpolate the result, where a passed-through null printed "null".
test("null / undefined / empty → empty string, never the word 'null'", () => {
  expect(formatDate(null)).toBe("");
  expect(formatDate(undefined)).toBe("");
  expect(formatDate("")).toBe("");
  expect(`hạn ${formatDate(null)}`).toBe("hạn ");
});

test("unparsable input is passed through unchanged", () => {
  expect(formatDate("hôm nay")).toBe("hôm nay");
  expect(formatDate("25/07/2026")).toBe("25/07/2026"); // already display form
  expect(formatDate("2026-7-5")).toBe("2026-7-5"); // unpadded ≠ ISO
});

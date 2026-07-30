import { expect, test } from "bun:test";

import { formatVnDate, parseVnDate } from "./date-input";

test("iso <-> vn display round-trip", () => {
  expect(formatVnDate("2026-07-25")).toBe("25/07/2026");
  expect(formatVnDate("")).toBe("");
  expect(parseVnDate("25/07/2026")).toBe("2026-07-25");
  expect(parseVnDate("5/7/2026")).toBe("2026-07-05");
});

test("rejects non-dates instead of rolling over", () => {
  expect(parseVnDate("31/02/2026")).toBeNull();
  expect(parseVnDate("29/02/2024")).toBe("2024-02-29"); // real leap day
  expect(parseVnDate("25/7/26")).toBeNull();
  expect(parseVnDate("abc")).toBeNull();
});

test("vietnamese month label", () => {
  const label = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(2026, 6, 1));
  expect(label).toContain("7");
  expect(label.toLowerCase()).toContain("tháng");
});

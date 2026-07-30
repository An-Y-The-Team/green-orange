import { expect, test } from "vitest";

import { formatVND } from "@/utils/format-vnd/format-vnd";

import {
  caretAfterDigits,
  countDigits,
  formatVndDigits,
  parseVndInput,
} from "./money-input";

// This parser decides what a quote, deposit or settlement is worth. Every case
// below is a 10× (or 1000×) error if it regresses, so they pin exact values.

test("grouped digits round-trip", () => {
  expect(formatVndDigits("12500000")).toBe("12.500.000");
  expect(parseVndInput("12.500.000")).toBe(12500000);
  // Whatever formatVND emits must paste back in — it separates the amount from
  // ₫ with a NBSP, not a space, and that's what users copy off other screens.
  expect(parseVndInput(formatVND(12500000))).toBe(12500000);
});

test("shorthand scales", () => {
  expect(parseVndInput("12tr")).toBe(12_000_000);
  expect(parseVndInput("12,5tr")).toBe(12_500_000);
  expect(parseVndInput("500k")).toBe(500_000);
  expect(parseVndInput("1,2 tỷ")).toBe(1_200_000_000);
  expect(parseVndInput("2 triệu")).toBe(2_000_000);
});

test("`m` is mét, not triệu — a construction CRM must not scale it", () => {
  // The whole reason `m`/`b` are absent from the suffix table.
  expect(parseVndInput("12m²")).toBeNull();
  expect(parseVndInput("12m")).toBeNull();
});

test("unusable input is null, never a silent zero", () => {
  expect(parseVndInput("")).toBeNull();
  expect(parseVndInput("abc")).toBeNull();
  expect(parseVndInput("-5")).toBeNull(); // money can't be negative
  expect(parseVndInput("tr")).toBeNull(); // a bare suffix is not 0 đồng
  expect(formatVndDigits("")).toBe("");
});

test("only whole đồng come out", () => {
  // VND has no fractional unit and the column is BigInt.
  expect(Number.isInteger(parseVndInput("12,5tr"))).toBe(true);
  expect(parseVndInput("1,5k")).toBe(1500);
  // Dots group in vi-VN, so "12.5" is the digits 125 — not 12½. Matches Base
  // UI's own locale parsing, and "12,5" is how a Vietnamese user writes a half.
  expect(parseVndInput("12.5")).toBe(125);
});

test("stays exact past 2^53 instead of rounding", () => {
  expect(formatVndDigits("9007199254740993")).toBe("9.007.199.254.740.993");
});

// The caret has to be re-placed by digit count, because regrouping moves every
// separator. Off-by-one here means the cursor drifts a character per keystroke,
// which is exactly what makes hand-rolled money inputs unusable.
test("caret lands after the same digit it was after, not the same index", () => {
  // Typing the 4th digit of "1250" turns it into "1.250": the caret was at
  // index 4 (after 4 digits) and must now be at index 5, past the inserted dot.
  expect(caretAfterDigits("1.250", countDigits("1250"))).toBe(5);
  // Caret at the very start stays at the start.
  expect(caretAfterDigits("12.500.000", 0)).toBe(0);
  // Editing mid-string: after 2 digits of "12.500.000" is index 2, before the dot.
  expect(caretAfterDigits("12.500.000", 2)).toBe(2);
  // After 3 digits skips the separator entirely.
  expect(caretAfterDigits("12.500.000", 3)).toBe(4);
  // Every digit consumed -> end of string, never past it.
  expect(caretAfterDigits("12.500.000", 8)).toBe(10);
  expect(caretAfterDigits("12.500.000", 99)).toBe(10);
  // Separators are not digits.
  expect(countDigits("12.500.000 ₫")).toBe(8);
});

import { expect, test } from "vitest";

import { formatVND } from "./format-vnd";

// vi-VN currency formatting puts a NON-BREAKING space before ₫ — asserted
// explicitly so a locale/ICU change that swaps it shows up here and not as a
// line-broken "₫" on a printed contract.
const D = " ₫";

test("groups thousands with dots, vi-VN style", () => {
  expect(formatVND(12_500_000)).toBe(`12.500.000${D}`);
  expect(formatVND(999)).toBe(`999${D}`);
  expect(formatVND(1_000)).toBe(`1.000${D}`);
});

test("zero renders as 0 ₫, not blank", () => {
  expect(formatVND(0)).toBe(`0${D}`);
});

test("negative amounts keep their sign (a credit note / adjustment)", () => {
  expect(formatVND(-1_500_000)).toBe(`-1.500.000${D}`);
});

// VND totals routinely exceed int32 (2_147_483_647) — the reason the backend
// stores money as BigInt. The formatter must not lose or round those digits.
test("a VND value above int32 keeps every digit", () => {
  expect(formatVND(3_000_000_000)).toBe(`3.000.000.000${D}`);
  expect(formatVND(2_147_483_648)).toBe(`2.147.483.648${D}`);
});

test("VND has no fractional digits — no ,00 tail", () => {
  expect(formatVND(1_234.56)).toBe(`1.235${D}`);
});

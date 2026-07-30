import { expect, test } from "vitest";

import { vndInWords } from "./vnd-in-words";

// These words are printed next to formatVND(amount) on quotes and contracts
// (docx-export, merge-template's `value_in_words`, the printable). Any
// disagreement between the figure and its spelled-out form is a legal defect,
// so every case below pins the exact sentence a customer would read.

test("zero reads as a number, not an empty amount", () => {
  expect(vndInWords(0)).toBe("Không đồng");
});

test("units, teens and the mốt/lăm joining rules", () => {
  // The two rules a naive table lookup gets wrong: after "mươi" a trailing 1 is
  // "mốt" (not "một") and a trailing 5 is "lăm" (not "năm"); after "mười" only
  // the 5 changes.
  expect(vndInWords(9)).toBe("Chín đồng");
  expect(vndInWords(10)).toBe("Mười đồng");
  expect(vndInWords(11)).toBe("Mười một đồng");
  expect(vndInWords(15)).toBe("Mười lăm đồng");
  expect(vndInWords(20)).toBe("Hai mươi đồng");
  expect(vndInWords(21)).toBe("Hai mươi mốt đồng");
  expect(vndInWords(25)).toBe("Hai mươi lăm đồng");
  expect(vndInWords(99)).toBe("Chín mươi chín đồng");
});

test("a zero tens digit inside a group becomes 'lẻ', not silence", () => {
  // Dropping "lẻ" would turn 105 into "một trăm năm" — which reads as 150.
  expect(vndInWords(105)).toBe("Một trăm lẻ năm đồng");
  expect(vndInWords(101)).toBe("Một trăm lẻ một đồng");
  expect(vndInWords(110)).toBe("Một trăm mười đồng");
  // 5 after "lẻ" stays "năm"; only "mười/mươi" turn it into "lăm".
  expect(vndInWords(1_005)).toBe("Một nghìn không trăm lẻ năm đồng");
});

test("one scale word per three-digit group", () => {
  expect(vndInWords(1_000)).toBe("Một nghìn đồng");
  expect(vndInWords(1_000_000)).toBe("Một triệu đồng");
  expect(vndInWords(1_000_000_000)).toBe("Một tỷ đồng");
  expect(vndInWords(1_000_000_000_000)).toBe("Một nghìn tỷ đồng");
});

test("several scale groups in one amount stay in order", () => {
  // The example in the module docstring — tỷ / triệu / nghìn / units all spoken.
  expect(vndInWords(81_307_800)).toBe(
    "Tám mươi mốt triệu ba trăm lẻ bảy nghìn tám trăm đồng"
  );
  expect(vndInWords(12_500_000_000)).toBe("Mười hai tỷ năm trăm triệu đồng");
});

test("an interior zero group emits no scale word of its own", () => {
  // 1.000.500 has an empty thousands group between "triệu" and the units. A
  // naive loop either keeps the group ("một triệu không nghìn năm trăm") or
  // shifts the scales down ("một triệu năm trăm nghìn" = 1.500.000 — a
  // 1000× error on a contract).
  expect(vndInWords(1_000_500)).toBe("Một triệu năm trăm đồng");
  expect(vndInWords(1_000_500)).not.toContain("nghìn");

  // Two empty groups in a row, and a units group whose own hundreds digit is 0
  // — the "không trăm" filler is what keeps "ba mươi bốn" from reading as
  // thousands.
  expect(vndInWords(2_000_000_034)).toBe("Hai tỷ không trăm ba mươi bốn đồng");
  expect(vndInWords(1_000_005)).toBe("Một triệu không trăm lẻ năm đồng");
});

test("realistic invoice and above-int32 contract values", () => {
  // Money is integer VND and VND overflows int32 fast, so the group loop has to
  // stay exact well past 2^31.
  expect(vndInWords(45_600_000)).toBe("Bốn mươi lăm triệu sáu trăm nghìn đồng");
  expect(vndInWords(4_294_967_296)).toBe(
    "Bốn tỷ hai trăm chín mươi bốn triệu chín trăm sáu mươi bảy nghìn hai trăm chín mươi sáu đồng"
  );
});

// The bug this guards: the function used to Math.floor, while the numeral beside
// it (formatVND, maximumFractionDigits: 0) rounds — so 1500.9 printed
// "1.501 ₫" next to "một nghìn năm trăm đồng", off by one đồng in writing.
test("rounds like the numeral instead of truncating", () => {
  expect(vndInWords(1_500.9)).toBe("Một nghìn năm trăm lẻ một đồng");
  expect(vndInWords(1_500.4)).toBe("Một nghìn năm trăm đồng");
  expect(vndInWords(0.4)).toBe("Không đồng");
});

// The bug this guards: Math.abs silently dropped the sign, so a negative
// adjustment printed "-5.000.000 ₫" as "Năm triệu đồng" — the words claimed the
// customer owed five million rather than being owed it.
test("a negative amount keeps its sign in words", () => {
  expect(vndInWords(-5_000_000)).toBe("Âm năm triệu đồng");
});

// The bug this guards: Infinity % 1000 is NaN and Infinity / 1000 is still
// Infinity, so the group loop never terminated — a non-finite total froze
// whatever was rendering the document. NaN is the shape a missing
// `total_amount` arrives in.
test("non-finite amounts return instead of hanging", () => {
  expect(vndInWords(Number.NaN)).toBe("Không đồng");
  expect(vndInWords(Number.POSITIVE_INFINITY)).toBe("Không đồng");
  expect(vndInWords(Number.NEGATIVE_INFINITY)).toBe("Không đồng");
});

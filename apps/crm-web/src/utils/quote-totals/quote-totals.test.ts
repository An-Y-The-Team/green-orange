import { expect, test } from "vitest";

import { itemAmount, quoteTotals, storedTotals } from "./quote-totals";

// The bug this guards: the server owns QuoteItem.amount (= round(quantity ×
// unit_price)) and total_amount (= Σ amount). Recomputing quantity × unit_price
// in JS made the printed line items not add up to the printed subtotal as soon
// as a quantity was fractional (m² is a real unit here).
test("fractional quantity: subtotal is the server's Σ amount, not the float product", () => {
  const items = [{ quantity: 12.5, unit_price: 33_333, amount: 416_663 }];
  const { subtotal } = quoteTotals(items, 0.08);

  expect(subtotal).toBe(416_663); // server value; the raw product is 416_662.5
  expect(Number.isInteger(subtotal)).toBe(true);
});

test("prefers the stored amount over the product when they disagree", () => {
  // A saved row whose server amount was rounded from a Decimal quantity.
  const items = [{ quantity: 3.33, unit_price: 30, amount: 100 }];

  expect(itemAmount(items[0])).toBe(100); // not 99.9, not 100.00000000000001
  expect(quoteTotals(items, 0).subtotal).toBe(100);
});

test("unsaved builder rows fall back to the rounded product, per line", () => {
  // No `amount` yet — Σ of rounded lines (2 + 2), never a rounded Σ (3).
  const rows = [
    { quantity: 0.5, unit_price: 3 },
    { quantity: 0.5, unit_price: 3 },
  ];

  expect(rows.map(itemAmount)).toEqual([2, 2]);
  expect(quoteTotals(rows, 0).subtotal).toBe(4);
});

test("printed lines always sum to the printed subtotal", () => {
  const items = [
    { quantity: 12.5, unit_price: 33_333, amount: 416_663 },
    { quantity: 1, unit_price: 4_050_000, amount: 4_050_000 },
  ];
  const lines = items.map(itemAmount).reduce((s, a) => s + a, 0);

  expect(quoteTotals(items, 0.08).subtotal).toBe(lines);
});

test("VAT is rounded once off the subtotal; total is their integer sum", () => {
  const { subtotal, vat, total } = quoteTotals(
    [{ quantity: 12.5, unit_price: 33_333, amount: 416_663 }],
    0.08
  );

  expect(subtotal).toBe(416_663);
  expect(vat).toBe(33_333); // round(33_333.04)
  expect(total).toBe(449_996);
});

test("no items → zeros, not NaN", () => {
  expect(quoteTotals([], 0.08)).toEqual({ subtotal: 0, vat: 0, total: 0 });
});

// storedTotals is the display path for a SAVED quote: never re-derive the
// subtotal from items, so the printable can't drift from the /quotes list.
test("storedTotals derives VAT from the stored total_amount", () => {
  expect(storedTotals({ total_amount: 200_000_000, vat_rate: 0.08 })).toEqual({
    subtotal: 200_000_000,
    vat: 16_000_000,
    total: 216_000_000,
  });
});

test("storedTotals keeps VAT integral for an odd subtotal", () => {
  const { vat, total } = storedTotals({
    total_amount: 416_663,
    vat_rate: 0.08,
  });

  expect(vat).toBe(33_333);
  expect(total).toBe(449_996);
  expect(Number.isInteger(vat)).toBe(true);
});

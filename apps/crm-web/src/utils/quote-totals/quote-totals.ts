import type { Quote, QuoteItem } from "@/app/(dashboard)/quotes/types";

/**
 * A row to total: a SAVED item (carries the server's `amount`) or an unsaved
 * builder row (amount not computed yet).
 */
export type QuoteTotalsItem = Pick<QuoteItem, "quantity" | "unit_price"> &
  Partial<Pick<QuoteItem, "amount">>;

/**
 * One line's money in VND. The server owns `amount` — prefer it so printed
 * lines always sum to the printed subtotal; the rounded product is only for
 * unsaved builder rows. Rounding mirrors crm-api-nest quotes.module.ts.
 */
export function itemAmount(item: QuoteTotalsItem): number {
  return (
    item?.amount ?? Math.round((item?.quantity ?? 0) * (item?.unit_price ?? 0))
  );
}

/**
 * Display-side quote/settlement money math from line items + VAT rate.
 * For a saved document prefer {@link storedTotals} — reading `total_amount`
 * cannot drift from the figure the list pages show.
 */
export function quoteTotals(items: QuoteTotalsItem[], vatRate: number) {
  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + itemAmount(item),
    0
  );
  const vat = Math.round(subtotal * vatRate);
  return { subtotal, vat, total: subtotal + vat };
}

/**
 * Money split for a quyết toán: Σ items, less giảm giá, then VAT — mirroring
 * `payableTotal` in crm-api-nest receivables/settlement-money.ts, which is what the hóa
 * đơn is actually billed for. `total` is the payable; `subtotal` is the pre-tax
 * Σ the sheet prints as "Cộng".
 *
 * Works on a saved Settlement or on live builder rows (pass a computed Σ).
 *
 * An over-discount is clamped rather than thrown: the form (settlementFormSchema)
 * and the API (assertDiscountWithin) both reject it at write time, so this only
 * guards RENDERING a row that arrived some other way — never a negative total on
 * a printed sheet.
 */
export function settlementTotals({
  total_amount,
  discount_amount = 0,
  vat_rate = 0,
}: {
  total_amount: number;
  discount_amount?: number;
  vat_rate?: number;
}) {
  const discount = Math.min(discount_amount, total_amount);
  const net = total_amount - discount;
  const vat = Math.round(net * vat_rate);
  return { subtotal: total_amount, discount, net, vat, total: net + vat };
}

/**
 * VAT split for a SAVED quote — `total_amount` is the server's Σ item amounts
 * (before VAT). Single VAT rule for screen, printable, .docx and merge tokens.
 */
export function storedTotals({
  total_amount,
  vat_rate,
}: Pick<Quote, "total_amount" | "vat_rate">) {
  const vat = Math.round(total_amount * vat_rate);
  return { subtotal: total_amount, vat, total: total_amount + vat };
}

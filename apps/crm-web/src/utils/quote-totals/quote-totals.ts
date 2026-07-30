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

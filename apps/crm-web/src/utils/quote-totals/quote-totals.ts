import type { QuoteItem } from "@/app/(dashboard)/quotes/types";

/**
 * Display-side quote/settlement money math from line items + VAT rate.
 * The server recomputes on save and is authoritative.
 */
export function quoteTotals(
  items: Pick<QuoteItem, "quantity" | "unit_price">[],
  vatRate: number
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const vat = Math.round(subtotal * vatRate);
  return { subtotal, vat, total: subtotal + vat };
}

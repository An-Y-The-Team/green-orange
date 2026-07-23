import type { QuoteItem } from "@/app/(dashboard)/quotes/types";

/** Vietnamese đồng — e.g. 12.500.000 ₫. No fractional digits (VND has none). */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** ISO date (YYYY-MM-DD or full ISO) → dd/MM/yyyy. Unparsable → unchanged. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

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

/** Derived overdue (Quá hạn) — due date passed and not yet done/paid. */
export function isOverdue(dueDate: string | null | undefined, done: boolean) {
  if (!dueDate || done) return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

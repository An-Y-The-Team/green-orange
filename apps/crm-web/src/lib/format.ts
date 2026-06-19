import type { Cost, Project } from "@/app/(dashboard)/projects/types";
import type { QuoteItem } from "@/app/(dashboard)/quotes/types";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Vietnamese đồng — e.g. 12.500.000 ₫. No fractional digits (VND has none). */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** ISO date (YYYY-MM-DD) → dd/MM/yyyy. Returns the input unchanged if unparsable. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Quote money math, derived from line items + VAT rate. Never stored. */
export function quoteTotals(items: QuoteItem[], vatRate: number) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const vat = Math.round(subtotal * vatRate);
  return { subtotal, vat, total: subtotal + vat };
}

/** Estimated-vs-actual for a project, given its logged costs. */
export function projectActuals(project: Project, costs: Cost[]) {
  const actual_cost = costs.reduce((sum, c) => sum + c.amount, 0);
  const margin = project.contract_value - actual_cost;
  const margin_pct =
    project.contract_value > 0
      ? Math.round((margin / project.contract_value) * 100)
      : 0;
  return { actual_cost, margin, margin_pct };
}

/** Công nợ rollup across a set of payment milestones. */
export function receivables(milestones: PaymentMilestone[]) {
  const total_due = milestones.reduce((sum, m) => sum + m.due_amount, 0);
  const total_paid = milestones.reduce((sum, m) => sum + m.paid_amount, 0);
  const retention = milestones
    .filter((m) => m.type === "giu_bao_hanh")
    .reduce((sum, m) => sum + (m.due_amount - m.paid_amount), 0);
  return {
    total_due,
    total_paid,
    outstanding: total_due - total_paid,
    retention,
  };
}

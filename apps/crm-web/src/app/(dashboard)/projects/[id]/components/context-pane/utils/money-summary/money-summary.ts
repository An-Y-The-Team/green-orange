import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  BillStatus,
  MilestoneStatus,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";
import { storedTotals } from "@/utils/quote-totals/quote-totals";

const DAY_MS = 86_400_000;

export interface MoneySummary {
  value: number;
  collected: number;
  remaining: number;
  /** The most overdue unpaid đợt, if any. */
  overdue?: { days: number; amount: number };
}

/**
 * The context pane's "Tiền" block. Value is what the client owes as of now:
 * the official bill once the quyết toán is signed (it carries VAT and any
 * phát sinh), else the chốt quote, else the latest quote. `null` = no quote yet.
 * `today` is passed in so the overdue count is testable.
 */
export function moneySummary({
  quotes,
  bills,
  milestones,
  today,
}: {
  quotes: Quote[];
  bills: Bill[];
  milestones: PaymentMilestone[];
  today: string;
}): MoneySummary | null {
  const official = bills.find((b) => b.status !== BillStatus.DRAFT);
  const deal = quotes.find((q) => q.status === QuoteStatus.DEAL);
  const latest = quotes.reduce<Quote | undefined>(
    (best, q) => (!best || q.version > best.version ? q : best),
    undefined
  );
  const quote = deal ?? latest;
  const value = official
    ? official.total_amount
    : quote
      ? storedTotals(quote).total
      : null;
  if (value === null) return null;

  const collected = milestones
    .filter((m) => m.status === MilestoneStatus.PAID)
    .reduce((sum, m) => sum + m.amount, 0);
  const late = milestones
    .filter(
      (m) =>
        m.status !== MilestoneStatus.PAID && m.due_date && m.due_date < today
    )
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];

  return {
    value,
    collected,
    remaining: Math.max(value - collected, 0),
    // Both sides are YYYY-MM-DD, parsed as UTC midnight — an exact day count.
    overdue: late?.due_date
      ? {
          days: Math.round(
            (Date.parse(today) - Date.parse(late.due_date)) / DAY_MS
          ),
          amount: late.amount,
        }
      : undefined,
  };
}

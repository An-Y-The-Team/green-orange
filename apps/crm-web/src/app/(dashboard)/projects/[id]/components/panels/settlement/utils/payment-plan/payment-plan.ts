import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";

export interface PaymentPlan {
  /** The đợt to collect next, if any. */
  next?: PaymentMilestone;
  /** Collecting `next` pays off the bill: the server then closes the project. */
  isLast: boolean;
  /** Σ of the other unpaid đợt on the bill. */
  remainingAfter: number;
  /** Σ of every paid đợt (the deposit included). */
  collected: number;
  /** What the client owes: the bill's total. */
  target: number;
  /** "Đợt N" per milestone id, in creation order. */
  numbers: Map<number, number>;
}

/**
 * Where the money stands on a signed settlement. Call only once signed: the
 * đợt are derived on sign. `next` is the earliest hạn first, undated ones after
 * in creation order. `isLast` mirrors the server's `fullyPaid` rule, which only
 * looks at the bill's own đợt.
 */
export function paymentPlan({
  milestones,
  bill,
}: {
  milestones: PaymentMilestone[];
  bill?: Bill | null;
}): PaymentPlan {
  const unpaid = milestones.filter((m) => m.status !== MilestoneStatus.PAID);
  const next = [...unpaid].sort(
    (a, b) =>
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.id - b.id
  )[0];

  const unpaidOnBill = unpaid.filter((m) => bill && m.bill_id === bill.id);
  const others = unpaidOnBill.filter((m) => m.id !== next?.id);
  const isLast =
    Boolean(next) &&
    unpaidOnBill.length === 1 &&
    unpaidOnBill[0]?.id === next?.id;

  const numbers = new Map(
    [...milestones].sort((a, b) => a.id - b.id).map((m, i) => [m.id, i + 1])
  );

  return {
    next,
    isLast,
    remainingAfter: others.reduce((sum, m) => sum + m.amount, 0),
    collected: milestones
      .filter((m) => m.status === MilestoneStatus.PAID)
      .reduce((sum, m) => sum + m.amount, 0),
    target: bill?.total_amount ?? 0,
    numbers,
  };
}

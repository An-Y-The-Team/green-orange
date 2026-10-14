import { describe, expect, test } from "vitest";

import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";

import { paymentPlan } from "./payment-plan";

const bill: Bill = {
  id: 5,
  project_id: 1,
  settlement_id: 2,
  status: BillStatus.OFFICIAL,
  total_amount: 300,
};

const ms = (
  id: number,
  amount: number,
  over: Partial<PaymentMilestone> = {}
): PaymentMilestone => ({
  id,
  project_id: 1,
  bill_id: 5,
  type: MilestoneType.PROGRESS,
  amount,
  due_date: null,
  status: MilestoneStatus.NOT_DUE,
  ...over,
});

const paid = { status: MilestoneStatus.PAID, paid_date: "2026-10-01" };

describe("paymentPlan", () => {
  test("two unpaid: next is earliest hạn, not last", () => {
    const plan = paymentPlan({
      bill,
      milestones: [
        ms(1, 100, paid),
        ms(2, 120, { due_date: "2026-12-01" }),
        ms(3, 80, { due_date: "2026-11-01" }),
      ],
    });
    expect(plan.next?.id).toBe(3);
    expect(plan.isLast).toBe(false);
    expect(plan.remainingAfter).toBe(120);
    expect(plan.collected).toBe(100);
    expect(plan.target).toBe(300);
    expect(plan.numbers.get(3)).toBe(3);
  });

  test("one unpaid: last", () => {
    const plan = paymentPlan({
      bill,
      milestones: [ms(1, 100, paid), ms(2, 200)],
    });
    expect(plan.next?.id).toBe(2);
    expect(plan.isLast).toBe(true);
    expect(plan.remainingAfter).toBe(0);
  });

  test("unallocated deposit present: it can be next but never last", () => {
    const deposit = ms(1, 100, {
      bill_id: null,
      type: MilestoneType.DEPOSIT,
      due_date: "2026-01-01",
    });
    const plan = paymentPlan({ bill, milestones: [deposit, ms(2, 200)] });
    expect(plan.next?.id).toBe(1);
    expect(plan.isLast).toBe(false);
    expect(plan.remainingAfter).toBe(200);
  });

  test("an unallocated deposit does not stop the last bill đợt being last", () => {
    const deposit = ms(1, 100, { bill_id: null, ...paid });
    const plan = paymentPlan({ bill, milestones: [deposit, ms(2, 200)] });
    expect(plan.isLast).toBe(true);
  });

  test("no due dates: creation order", () => {
    const plan = paymentPlan({ bill, milestones: [ms(9, 10), ms(4, 10)] });
    expect(plan.next?.id).toBe(4);
  });

  test("all paid: no next", () => {
    const plan = paymentPlan({
      bill,
      milestones: [ms(1, 100, paid), ms(2, 200, paid)],
    });
    expect(plan.next).toBeUndefined();
    expect(plan.isLast).toBe(false);
    expect(plan.collected).toBe(300);
  });
});

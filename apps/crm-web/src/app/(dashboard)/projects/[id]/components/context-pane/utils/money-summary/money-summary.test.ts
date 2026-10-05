import { describe, expect, test } from "vitest";

import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";

import { moneySummary } from "./money-summary";

const quote = (version: number, status: QuoteStatus, total: number) =>
  ({ id: version, version, status, total_amount: total, vat_rate: 0 }) as Quote;
const bill = (status: BillStatus, total: number) =>
  ({ id: 1, project_id: 1, status, total_amount: total }) as Bill;
const ms = (
  amount: number,
  status: MilestoneStatus,
  due_date?: string
): PaymentMilestone => ({
  id: amount,
  project_id: 1,
  type: MilestoneType.PROGRESS,
  amount,
  status,
  due_date,
});

const today = "2026-11-20";

describe("moneySummary", () => {
  test("no quote and no bill → null", () => {
    expect(
      moneySummary({ quotes: [], bills: [], milestones: [], today })
    ).toBeNull();
  });

  test("the chốt quote wins over a newer draft", () => {
    const out = moneySummary({
      quotes: [
        quote(2, QuoteStatus.DEAL, 100),
        quote(3, QuoteStatus.DRAFT, 90),
      ],
      bills: [],
      milestones: [],
      today,
    });
    expect(out?.value).toBe(100);
  });

  test("an official bill overrides the quote; a draft bill does not", () => {
    const quotes = [quote(1, QuoteStatus.DEAL, 100)];
    expect(
      moneySummary({
        quotes,
        bills: [bill(BillStatus.DRAFT, 0)],
        milestones: [],
        today,
      })?.value
    ).toBe(100);
    expect(
      moneySummary({
        quotes,
        bills: [bill(BillStatus.SENT, 120)],
        milestones: [],
        today,
      })?.value
    ).toBe(120);
  });

  test("collected, remaining and the most overdue đợt", () => {
    const out = moneySummary({
      quotes: [quote(1, QuoteStatus.DEAL, 100)],
      bills: [],
      milestones: [
        ms(60, MilestoneStatus.PAID, "2026-10-01"),
        ms(30, MilestoneStatus.AWAITING_PAYMENT, "2026-11-15"),
        ms(10, MilestoneStatus.NOT_DUE, "2026-11-10"),
      ],
      today,
    });
    expect(out).toMatchObject({ collected: 60, remaining: 40 });
    expect(out?.overdue).toEqual({ days: 10, amount: 10 });
  });

  test("a paid đợt past its date is not overdue", () => {
    const out = moneySummary({
      quotes: [quote(1, QuoteStatus.DEAL, 100)],
      bills: [],
      milestones: [ms(100, MilestoneStatus.PAID, "2026-01-01")],
      today,
    });
    expect(out?.overdue).toBeUndefined();
  });
});

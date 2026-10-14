import { describe, expect, test } from "vitest";

import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";

import { settlementHistory } from "./settlement-history";

const settlement: Settlement = {
  id: 1,
  project_id: 1,
  status: SettlementStatus.SIGNED,
  total_amount: 300,
  discount_amount: 0,
  vat_rate: 0,
  signed_date: "2026-10-01",
  items: [],
};
const bill: Bill = {
  id: 5,
  project_id: 1,
  status: BillStatus.SENT,
  total_amount: 300,
  sent_date: "2026-10-03",
};
const paid = (id: number, paid_date: string): PaymentMilestone => ({
  id,
  project_id: 1,
  bill_id: 5,
  type: MilestoneType.PROGRESS,
  amount: 100,
  status: MilestoneStatus.PAID,
  paid_date,
});

describe("settlementHistory", () => {
  test("newest first, from stored dates", () => {
    const entries = settlementHistory({
      settlement,
      bill,
      milestones: [paid(1, "2026-10-02"), paid(2, "2026-10-09")],
      numbers: new Map([
        [1, 1],
        [2, 2],
      ]),
    });
    expect(entries.map((e) => e.date)).toEqual([
      "2026-10-09",
      "2026-10-03",
      "2026-10-02",
      "2026-10-01",
    ]);
    expect(entries[0]?.label).toContain("Đã thu đợt 2");
    expect(entries[1]?.label).toBe("Đã gửi đề nghị thanh toán");
    expect(entries[3]?.label).toBe("Khách ký quyết toán");
  });

  test("nothing stored, nothing listed", () => {
    expect(settlementHistory({ milestones: [], numbers: new Map() })).toEqual(
      []
    );
  });
});

// Contract-critical pure logic, unit-tested without a DB (bun test). The full
// HTTP roundtrip is the curl smoke check in the README's verify section.
import { Prisma } from "@prisma/client";
import { describe, expect, test } from "bun:test";

import { toBig } from "./common/coerce";
import { normalize } from "./common/serialize.interceptor";
import {
  STAGE_ORDER,
  fullyPaid,
  paperworkReady,
  shouldAdvance,
} from "./common/stage";
import { SettlementsController } from "./receivables/receivables.module";

describe("normalize (serialization contract)", () => {
  test("BigInt VND → JSON number", () => {
    expect(normalize({ value: 120_000_000n })).toEqual({ value: 120_000_000 });
  });
  test("*_date columns → YYYY-MM-DD", () => {
    expect(normalize({ start_date: new Date("2026-06-01T00:00:00Z") })).toEqual(
      {
        start_date: "2026-06-01",
      }
    );
  });
  test("*_at timestamps keep their time (appointments are same-day)", () => {
    expect(
      normalize({ appointment_at: new Date("2026-07-20T02:00:00.000Z") })
    ).toEqual({ appointment_at: "2026-07-20T02:00:00.000Z" });
  });
  test("Prisma Decimal (quantity, hours) → JSON number", () => {
    expect(normalize({ hours: new Prisma.Decimal("7.5") })).toEqual({
      hours: 7.5,
    });
  });
  test("walks arrays and nested objects (Quote.items)", () => {
    expect(
      normalize([{ items: [{ unit_price: 5_000_000n, quantity: 2 }] }])
    ).toEqual([{ items: [{ unit_price: 5_000_000, quantity: 2 }] }]);
  });
  test("passes null/undefined/strings through", () => {
    expect(normalize({ a: null, b: undefined, c: "x", d: 3 })).toEqual({
      a: null,
      b: undefined,
      c: "x",
      d: 3,
    });
  });
});

describe("toBig", () => {
  test("number → BigInt, null/undefined → null", () => {
    expect(toBig(500)).toBe(500n);
    expect(toBig(null)).toBeNull();
    expect(toBig(undefined)).toBeNull();
  });
});

describe("shouldAdvance (forward-only auto-advance)", () => {
  test("advances when target is ahead", () => {
    expect(shouldAdvance("request", "quote")).toBe(true);
  });
  test("never moves backward", () => {
    expect(shouldAdvance("execution", "quote")).toBe(false);
  });
  test("same stage is a no-op", () => {
    expect(shouldAdvance("quote", "quote")).toBe(false);
  });
  test("closed projects never auto-advance", () => {
    expect(shouldAdvance("closed", "settlement")).toBe(false);
  });
  // 2026-07-25: survey merged into request — 8 stages, and re-adding one
  // would silently shift every later index (advanceStage compares indices).
  test("8 stages, survey merged into request", () => {
    expect(STAGE_ORDER).toHaveLength(8);
    expect(STAGE_ORDER).not.toContain("survey");
    expect(STAGE_ORDER[0]).toBe("request");
  });
});

// Stage-4 exit. What must not regress: the later-stage documents seeded up
// front (needed_for acceptance/settlement) never hold up Thi công, and the cọc
// is part of the gate.
describe("paperworkReady (hồ sơ → Thi công)", () => {
  const item = (status: string, needed_for = "execution") => ({
    status,
    needed_for,
  });
  test("all execution items approved + cọc paid → ready", () => {
    expect(paperworkReady([item("approved"), item("approved")], true)).toBe(
      true
    );
  });
  test("later-stage items still preparing don't block", () => {
    expect(
      paperworkReady([item("approved"), item("preparing", "settlement")], true)
    ).toBe(true);
  });
  test("one execution item not approved → not ready", () => {
    expect(paperworkReady([item("approved"), item("submitted")], true)).toBe(
      false
    );
  });
  test("no cọc yet → not ready", () => {
    expect(paperworkReady([item("approved")], false)).toBe(false);
  });
  test("no execution items at all proves nothing", () => {
    expect(paperworkReady([item("approved", "acceptance")], true)).toBe(false);
    expect(paperworkReady([], true)).toBe(false);
  });
});

describe("fullyPaid (Quyết toán & Thanh toán → Đã đóng)", () => {
  const paid = { status: "paid" };
  const due = { status: "awaiting_payment" };
  test("signed + every đợt paid → closed", () => {
    expect(fullyPaid("signed", "sent", [paid, paid])).toBe(true);
  });
  test("signed + bill marked paid → closed", () => {
    expect(fullyPaid("signed", "paid", [due])).toBe(true);
  });
  test("one đợt outstanding → open", () => {
    expect(fullyPaid("signed", "sent", [paid, due])).toBe(false);
  });
  test("unsigned settlement never closes, even if money is in", () => {
    expect(fullyPaid("sent", "paid", [paid])).toBe(false);
    expect(fullyPaid(undefined, undefined, [])).toBe(false);
  });
  test("no đợt and bill not paid → open", () => {
    expect(fullyPaid("signed", "official", [])).toBe(false);
  });
});

// One quyết toán per project (1:1), so signed → draft is the correction path.
// Money is at stake: the deposit must survive, collected payments must block.
describe("settlement unsign (signed → draft)", () => {
  const row = {
    id: 7,
    project_id: 3,
    status: "signed",
    total_amount: 100n,
    bill: { id: 9, status: "official" },
  };
  const fake = (paidMilestone: unknown): any => {
    const calls: string[] = [];
    const tx = {
      settlement: { update: () => calls.push("settlement.update") },
      paymentMilestone: {
        updateMany: () => calls.push("deposit.detach"),
        deleteMany: () => calls.push("unpaid.delete"),
      },
      bill: { update: () => calls.push("bill.reset") },
    };
    return {
      calls,
      paymentMilestone: { findFirst: async () => paidMilestone },
      settlement: { findUnique: async () => ({ ...row, status: "draft" }) },
      $transaction: async (fn: any) => fn(tx),
    };
  };

  test("detaches the cọc BEFORE deleting unpaid đợt (order = no data loss)", async () => {
    const prisma = fake(null);
    await new SettlementsController(prisma).unsign(row as any);
    expect(prisma.calls).toEqual([
      "settlement.update",
      "deposit.detach",
      "unpaid.delete",
      "bill.reset",
    ]);
  });

  test("refuses once a payment has been collected on the bill", async () => {
    const prisma = fake({ id: 11, status: "paid" });
    await expect(
      new SettlementsController(prisma).unsign(row as any)
    ).rejects.toThrow(/already been collected/);
    expect(prisma.calls).toEqual([]);
  });

  test("refuses when the bill itself is marked paid", async () => {
    const prisma = fake(null);
    await expect(
      new SettlementsController(prisma).unsign({
        ...row,
        bill: { ...row.bill, status: "paid" },
      } as any)
    ).rejects.toThrow(/already been collected/);
    expect(prisma.calls).toEqual([]);
  });
});

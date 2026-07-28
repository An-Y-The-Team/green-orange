// Sign-time money math (F09), unit-tested without a DB (bun test) — same
// fake-prisma pattern as contract.test.ts. What must not regress: the bill and
// the balance đợt take the NEW settlement total, and every unallocated cọc is
// subtracted exactly once.
import { describe, expect, test } from "bun:test";

import { businessToday } from "../common/business-date";
import {
  PaymentMilestonesController,
  SettlementsController,
  settlementRemainder,
} from "./receivables.module";

describe("settlementRemainder (balance đợt on sign)", () => {
  test("no cọc → the whole total is the balance", () => {
    expect(settlementRemainder(480_000_000n, [])).toBe(480_000_000n);
  });

  test("sums EVERY unallocated cọc, not just the first", () => {
    expect(
      settlementRemainder(500_000_000n, [
        { amount: 100_000_000n },
        { amount: 100_000_000n },
      ])
    ).toBe(300_000_000n);
  });

  // Đợt are a payment SCHEDULE: an unpaid cọc is still a scheduled obligation,
  // so subtracting only the paid ones would over-bill the client.
  test("an unpaid not_due cọc is still subtracted", () => {
    expect(
      settlementRemainder(300_000_000n, [
        { amount: 90_000_000n, status: "not_due" },
      ] as { amount: bigint }[])
    ).toBe(210_000_000n);
  });

  test("cọc exceeding the total is a conflict, not a negative đợt", () => {
    expect(() =>
      settlementRemainder(100_000_000n, [{ amount: 150_000_000n }])
    ).toThrow(/exceeds the settlement total/);
  });
});

describe("settlement sign (PATCH items + status together)", () => {
  const stored = {
    id: 7,
    project_id: 3,
    status: "sent",
    total_amount: 300_000_000n,
    bill: { id: 9, status: "draft" },
  };

  const fake = (deposits: { id: number; amount: bigint }[]): any => {
    const writes: Record<string, unknown>[] = [];
    const tx = {
      // Prisma returns the updated row — the fix reads the new total off it.
      settlement: {
        update: async ({ data }: any) => ({ ...stored, ...data }),
      },
      bill: {
        findFirst: async () => stored.bill,
        update: async ({ data }: any) => writes.push({ bill: data }),
      },
      paymentMilestone: {
        findMany: async () => deposits,
        updateMany: async ({ where, data }: any) =>
          writes.push({ attach: where.id.in, bill_id: data.bill_id }),
        create: async ({ data }: any) => writes.push({ milestone: data }),
      },
    };
    return {
      writes,
      settlement: {
        findUnique: async () => stored,
        update: async () => stored,
      },
      project: { findUnique: async () => ({ stage: "settlement" }) },
      $transaction: async (fn: any) => fn(tx),
    };
  };

  const signWith480m = (prisma: any) =>
    new SettlementsController(prisma).update(7, {
      items: [
        { description: "Trồng cây", quantity: 1, unit_price: 480_000_000 },
      ],
      status: "signed",
    } as any);

  test("bill gets the NEW total, not the one stored before the PATCH", async () => {
    const prisma = fake([]);
    await signWith480m(prisma);
    expect(prisma.writes).toContainEqual({
      bill: { status: "official", total_amount: 480_000_000n },
    });
  });

  test("attaches every unallocated cọc and bills total − their sum", async () => {
    const prisma = fake([
      { id: 1, amount: 100_000_000n },
      { id: 2, amount: 100_000_000n },
    ]);
    await signWith480m(prisma);
    expect(prisma.writes).toContainEqual({ attach: [1, 2], bill_id: 9 });
    expect(prisma.writes).toContainEqual({
      milestone: {
        project_id: 3,
        bill_id: 9,
        type: "progress",
        amount: 280_000_000n,
      },
    });
  });

  test("cọc over the new total → 409, nothing written", async () => {
    const prisma = fake([{ id: 1, amount: 500_000_000n }]);
    await expect(signWith480m(prisma)).rejects.toThrow(
      /exceeds the settlement total/
    );
    expect(prisma.writes).toEqual([{ bill: expect.anything() }]);
  });
});

// A cọc is often recorded days after it arrived (F13 made it one POST), so the
// operator's date has to survive — the server stamp is only the fallback.
describe("milestone create paid_date", () => {
  const fake = (): any => {
    const created: Record<string, unknown>[] = [];
    return {
      created,
      project: { findUnique: async () => ({ stage: "paperwork" }) },
      paymentMilestone: {
        create: async ({ data }: any) => {
          created.push(data);
          return data;
        },
      },
    };
  };
  const deposit = { project_id: 3, type: "deposit", amount: 100_000_000 };

  test("keeps a backdated paid_date instead of stamping today", async () => {
    const prisma = fake();
    await new PaymentMilestonesController(prisma).create({
      ...deposit,
      status: "paid",
      paid_date: "2026-07-20",
    } as any);
    expect(prisma.created[0].paid_date).toEqual(
      new Date("2026-07-20T00:00:00.000Z")
    );
  });

  test("falls back to the business date when absent", async () => {
    const prisma = fake();
    await new PaymentMilestonesController(prisma).create({
      ...deposit,
      status: "paid",
    } as any);
    expect(prisma.created[0].paid_date).toEqual(businessToday());
  });

  test("no status → no paid_date at all", async () => {
    const prisma = fake();
    await new PaymentMilestonesController(prisma).create({ ...deposit } as any);
    expect(prisma.created[0].paid_date).toBeUndefined();
  });

  test("paid_date on a non-paid đợt is rejected, not stored", async () => {
    const prisma = fake();
    await expect(
      new PaymentMilestonesController(prisma).create({
        ...deposit,
        status: "not_due",
        paid_date: "2026-07-20",
      } as any)
    ).rejects.toThrow(/paid_date requires status/);
    expect(prisma.created).toEqual([]);
  });
});

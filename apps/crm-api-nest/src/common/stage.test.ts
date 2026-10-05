// closeIfFullyPaid against a recording fake tx (bun test, no DB). What must not
// regress: closing leaves the money consistent — a bill marked paid takes its
// open đợt with it (else they stay "awaiting payment", counted overdue and
// uneditable on a locked job) — and every write goes through the client the
// caller passed, i.e. the caller's transaction.
import { describe, expect, test } from "bun:test";

import { closeIfFullyPaid } from "./stage";

const fakeTx = (settlement: unknown, stage = "settlement") => {
  const writes: Record<string, unknown>[] = [];
  const tx = {
    writes,
    settlement: { findUnique: async () => settlement },
    bill: {
      update: async ({ data }: any) => writes.push({ bill: data.status }),
    },
    paymentMilestone: {
      updateMany: async ({ where, data }: any) =>
        writes.push({ milestones: where.bill_id, to: data.status }),
    },
    project: {
      findUnique: async () => ({ stage }),
      update: async ({ data }: any) => writes.push({ stage: data.stage }),
    },
  };
  return tx as any;
};

describe("closeIfFullyPaid", () => {
  test("bill marked paid → its open đợt are paid and the job closes", async () => {
    const tx = fakeTx({
      status: "signed",
      bill: {
        id: 9,
        status: "paid",
        milestones: [{ status: "paid" }, { status: "awaiting_payment" }],
      },
    });
    await closeIfFullyPaid(tx, 3);
    expect(tx.writes).toEqual([
      { milestones: 9, to: "paid" },
      { stage: "closed" },
    ]);
  });

  test("every đợt paid → the bill is paid and the job closes", async () => {
    const tx = fakeTx({
      status: "signed",
      bill: { id: 9, status: "sent", milestones: [{ status: "paid" }] },
    });
    await closeIfFullyPaid(tx, 3);
    expect(tx.writes).toContainEqual({ bill: "paid" });
    expect(tx.writes).toContainEqual({ stage: "closed" });
  });

  test("money still out → nothing is written", async () => {
    const tx = fakeTx({
      status: "signed",
      bill: { id: 9, status: "sent", milestones: [{ status: "not_due" }] },
    });
    await closeIfFullyPaid(tx, 3);
    expect(tx.writes).toEqual([]);
  });
});

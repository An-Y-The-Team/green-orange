// Paperwork PATCH re-checks "hồ sơ ready → Thi công" only when the change can
// complete the checklist. What must not regress: editing a note or due date on
// a job the operator moved back by hand (Thi công → Hồ sơ, "sửa nhầm") must
// not bounce it straight back to Thi công. (bun test, fake prisma, no DB.)
import { describe, expect, test } from "bun:test";

import { PaperworkItemsController } from "./paperwork.module";

const fake = () => {
  const calls: string[] = [];
  const self: any = {
    calls,
    paperworkItem: {
      findUnique: async () => ({ id: 1, project_id: 6, status: "approved" }),
      update: async ({ data }: any) => ({ id: 1, ...data }),
      findMany: async () => {
        calls.push("readiness-check");
        return [];
      },
    },
    paymentMilestone: { findFirst: async () => null },
    project: { findUnique: async () => ({ stage: "paperwork" }) },
  };
  self.$transaction = async (fn: any) => fn(self);
  return self;
};

describe("paperwork PATCH → auto-advance check", () => {
  test("a note-only edit does not re-check readiness", async () => {
    const prisma = fake();
    await new PaperworkItemsController(prisma).update(1, {
      note: "Đã gọi BQL",
    } as any);
    expect(prisma.calls).toEqual([]);
  });

  test("a status change does", async () => {
    const prisma = fake();
    await new PaperworkItemsController(prisma).update(1, {
      status: "approved",
    } as any);
    expect(prisma.calls).toEqual(["readiness-check"]);
  });

  test("retagging needed_for does too", async () => {
    const prisma = fake();
    await new PaperworkItemsController(prisma).update(1, {
      needed_for: "settlement",
    } as any);
    expect(prisma.calls).toEqual(["readiness-check"]);
  });
});

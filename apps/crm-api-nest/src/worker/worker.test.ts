// The mini-app submit path, unit-tested without a DB (fake-prisma pattern, see
// crew.test.ts). What must not regress: hours always come from the start/end
// pair server-side (never the client), an overnight shift crosses midnight
// instead of going negative, a worker can only log days an assignment covers
// (403), and an approved day is locked against resubmission (409) while
// pending/rejected days reset to pending.
import { describe, expect, test } from "bun:test";

import type { PrismaService } from "../prisma/prisma.service";
import { computeShiftHours, submitWorkerTimekeeping } from "./worker.module";

describe("computeShiftHours", () => {
  test("a plain day shift", () => {
    expect(computeShiftHours("07:30", "16:30")).toBe(9);
  });

  test("minutes come out as decimals, rounded to 2dp", () => {
    expect(computeShiftHours("08:00", "12:20")).toBe(4.33);
  });

  test("an overnight shift crosses midnight", () => {
    expect(computeShiftHours("22:00", "06:00")).toBe(8);
  });

  test("equal start and end reads as a 24h wrap and is rejected by the cap", () => {
    expect(() => computeShiftHours("08:00", "08:00")).toThrow(/16 giờ/);
  });

  test("a shift longer than the cap is rejected (swapped AM/PM typo)", () => {
    expect(() => computeShiftHours("06:00", "23:30")).toThrow(/16 giờ/);
  });
});

// One shared fixture: worker 1 is assigned to project 2 for days -10…+10
// around 2026-08-05, the project is open, and one zalo_app row already exists
// per scenario's `existing`.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const fake = (existing: { status: string } | null) => {
  const upserts: unknown[] = [];
  const prisma = {
    assignment: {
      findFirst: async ({
        where,
      }: {
        where: {
          crew_member_id: number;
          project_id: number;
          from_date: { lte: Date };
        };
      }) => {
        const covered =
          where.crew_member_id === 1 &&
          where.project_id === 2 &&
          where.from_date.lte >= day("2026-07-26") &&
          where.from_date.lte <= day("2026-08-15");
        return covered ? { id: 1 } : null;
      },
    },
    project: {
      findUnique: async () => ({ id: 2, stage: "execution" }),
    },
    timekeepingRecord: {
      findUnique: async () => existing,
      upsert: async (args: unknown) => {
        upserts.push(args);
        return { id: 6, ...(args as { update: object }).update };
      },
    },
  } as unknown as PrismaService;
  return { prisma, upserts };
};

const dto = (overrides: Partial<Record<string, string | number>> = {}) => ({
  project_id: 2,
  work_date: "2026-08-05",
  start_time: "22:00",
  end_time: "06:00",
  ...overrides,
});

describe("submitWorkerTimekeeping", () => {
  test("computes hours server-side and writes a pending zalo_app row", async () => {
    const { prisma, upserts } = fake(null);
    await submitWorkerTimekeeping(prisma, 1, dto() as never);
    const [args] = upserts as [
      { create: Record<string, unknown>; update: Record<string, unknown> },
    ];
    expect(args.create.hours).toBe(8); // 22:00 → 06:00 overnight
    expect(args.create.source).toBe("zalo_app");
    expect(args.create.status).toBe("pending");
    expect(args.update.status).toBe("pending");
  });

  test("a day outside every assignment window is a 403", async () => {
    const { prisma } = fake(null);
    await expect(
      submitWorkerTimekeeping(
        prisma,
        1,
        dto({ work_date: "2026-09-01" }) as never
      )
    ).rejects.toThrow(/không được phân công/);
  });

  test("an unassigned worker is a 403", async () => {
    const { prisma } = fake(null);
    await expect(
      submitWorkerTimekeeping(prisma, 99, dto() as never)
    ).rejects.toThrow(/không được phân công/);
  });

  test("an approved day is locked — 409, no write", async () => {
    const { prisma, upserts } = fake({ status: "approved" });
    await expect(
      submitWorkerTimekeeping(prisma, 1, dto() as never)
    ).rejects.toThrow(/đã được duyệt/);
    expect(upserts).toHaveLength(0);
  });

  test("a rejected day is overwritten back to pending (resubmission)", async () => {
    const { prisma, upserts } = fake({ status: "rejected" });
    await submitWorkerTimekeeping(prisma, 1, dto() as never);
    expect(upserts).toHaveLength(1);
  });
});

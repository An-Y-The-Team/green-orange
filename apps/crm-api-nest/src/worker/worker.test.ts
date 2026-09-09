// The mini-app clock-in / clock-out / đơn bù công paths, unit-tested without a
// DB (fake-prisma pattern, see crew.test.ts).
//
// What must not regress:
//   • hours ALWAYS come from the server, never the client — a stamped shift from
//     the two stamps, a remedy from the claimed pair;
//   • a stamped span knows its dates, so an abandoned shift is capped and
//     flagged instead of silently reading as a short overnight;
//   • clock-out never moves work_date — a 01:00 tap-out belongs to the shift's
//     own day, and moving it would move the row off its composite key;
//   • one shift at a time per worker, and one shift per công trình per day;
//   • a remedy closing an open shift may claim the END only — the server's
//     start stamp is not the worker's to rewrite;
//   • a worker can only log days an assignment covers (403), and an approved day
//     is locked against resubmission (409) while pending/rejected reset to pending.
import { describe, expect, test } from "bun:test";

import type { PrismaService } from "../prisma/prisma.service";
import {
  clockIn,
  clockOut,
  computeShiftHours,
  stampedShiftHours,
  submitRemedy,
} from "./worker.module";

describe("computeShiftHours (a CLAIMED pair — remedy only)", () => {
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

// The bug this whole block exists for: with only an "HH:mm" pair, 22:00 → 06:00
// is 8 hours whether the worker left at dawn or two days later. With both dates
// the span is the real one, which is the only way the cap means anything.
describe("stampedShiftHours (two server stamps)", () => {
  const span = (from: [string, string], to: [string, string]) =>
    stampedShiftHours({
      startDate: from[0],
      startTime: from[1],
      endDate: to[0],
      endTime: to[1],
    });

  test("a plain day shift, unflagged", () => {
    expect(span(["2026-08-05", "07:30"], ["2026-08-05", "17:00"])).toEqual({
      hours: 9.5,
      flag: null,
    });
  });

  test("an overnight shift is 8 hours, not 16", () => {
    expect(span(["2026-08-05", "22:00"], ["2026-08-06", "06:00"])).toEqual({
      hours: 8,
      flag: null,
    });
  });

  test("a shift abandoned overnight is capped and flagged, not read as 8 hours", () => {
    // Same "HH:mm" pair as the test above — a day later. computeShiftHours
    // cannot tell these apart; this is why clock-out does not use it.
    expect(span(["2026-08-05", "22:00"], ["2026-08-07", "06:00"])).toEqual({
      hours: 16,
      flag: "over_cap",
    });
  });

  test("exactly the cap is not flagged", () => {
    expect(span(["2026-08-05", "06:00"], ["2026-08-05", "22:00"])).toEqual({
      hours: 16,
      flag: null,
    });
  });

  test("one minute past the cap is", () => {
    expect(span(["2026-08-05", "06:00"], ["2026-08-05", "22:01"])).toEqual({
      hours: 16,
      flag: "over_cap",
    });
  });

  test("clock skew reads as zero, never as negative hours", () => {
    expect(span(["2026-08-05", "07:30"], ["2026-08-05", "07:29"])).toEqual({
      hours: 0,
      flag: null,
    });
  });
});

// One shared fixture: worker 1 is assigned to project 2 for days -10…+10
// around 2026-08-05, the project is open, and one zalo_app row already exists
// per scenario's `existing`.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const fake = (existing: { status: string; start_time?: string } | null) => {
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
  reason: "Quên chấm công vào",
  ...overrides,
});

describe("submitRemedy (đơn bù công)", () => {
  test("computes hours server-side and writes a pending zalo_app row", async () => {
    const { prisma, upserts } = fake(null);
    await submitRemedy(prisma, 1, dto() as never);
    const [args] = upserts as [
      { create: Record<string, unknown>; update: Record<string, unknown> },
    ];
    expect(args.create.hours).toBe(8); // 22:00 → 06:00 overnight
    expect(args.create.source).toBe("zalo_app");
    expect(args.create.status).toBe("pending");
    expect(args.update.status).toBe("pending");
  });

  // The discriminator the operator reads: without it a claimed row is
  // indistinguishable from a stamped one, since both land pending.
  test("the lý do is stored as remedy_reason, marking the times as claimed", async () => {
    const { prisma, upserts } = fake(null);
    await submitRemedy(prisma, 1, dto() as never);
    const [args] = upserts as [{ create: Record<string, unknown> }];
    expect(args.create.remedy_reason).toBe("Quên chấm công vào");
  });

  test("a day outside every assignment window is a 403", async () => {
    const { prisma } = fake(null);
    await expect(
      submitRemedy(prisma, 1, dto({ work_date: "2026-09-01" }) as never)
    ).rejects.toThrow(/không được phân công/);
  });

  test("an unassigned worker is a 403", async () => {
    const { prisma } = fake(null);
    await expect(submitRemedy(prisma, 99, dto() as never)).rejects.toThrow(
      /không được phân công/
    );
  });

  test("an approved day is locked — 409, no write", async () => {
    const { prisma, upserts } = fake({ status: "approved" });
    await expect(submitRemedy(prisma, 1, dto() as never)).rejects.toThrow(
      /đã được duyệt/
    );
    expect(upserts).toHaveLength(0);
  });

  test("a rejected day is overwritten back to pending (resubmission)", async () => {
    const { prisma, upserts } = fake({ status: "rejected" });
    await submitRemedy(prisma, 1, dto() as never);
    expect(upserts).toHaveLength(1);
  });

  test("closing an open shift keeps the SERVER's start stamp, not the claimed one", async () => {
    const { prisma, upserts } = fake({ status: "open", start_time: "07:30" });
    // The worker claims 06:00 — an earlier start than they actually clocked.
    await submitRemedy(
      prisma,
      1,
      dto({ start_time: "06:00", end_time: "17:00" }) as never
    );
    const [args] = upserts as [{ update: Record<string, unknown> }];
    expect(args.update.start_time).toBe("07:30");
    expect(args.update.hours).toBe(9.5); // 07:30 → 17:00, not 11 from 06:00
  });

  test("a resubmission clears a previous over-cap flag", async () => {
    const { prisma, upserts } = fake({ status: "pending" });
    await submitRemedy(
      prisma,
      1,
      dto({ start_time: "07:30", end_time: "17:00" }) as never
    );
    const [args] = upserts as [{ update: Record<string, unknown> }];
    expect(args.update.flag).toBeNull();
  });
});

// Clock-in/out fixtures work on "today", so they take the open row and any
// existing row for today explicitly rather than pinning a date.
const clockFake = ({
  open = null,
  today = null,
}: {
  open?: Record<string, unknown> | null;
  today?: Record<string, unknown> | null;
} = {}) => {
  const writes: { op: string; args: Record<string, unknown> }[] = [];
  const prisma = {
    assignment: { findFirst: async () => ({ id: 1 }) },
    project: { findUnique: async () => ({ id: 2, stage: "execution" }) },
    timekeepingRecord: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        where.status === "open" ? open : today,
      findUnique: async () => today,
      create: async (args: Record<string, unknown>) => {
        writes.push({ op: "create", args });
        return { id: 7, ...(args.data as object) };
      },
      update: async (args: Record<string, unknown>) => {
        writes.push({ op: "update", args });
        return { id: 7, ...(args.data as object) };
      },
    },
  } as unknown as PrismaService;
  return { prisma, writes };
};

describe("clockIn", () => {
  test("stamps the start and opens the shift at zero hours", async () => {
    const { prisma, writes } = clockFake();
    await clockIn(prisma, 1, 2);
    const data = writes[0]?.args.data as Record<string, unknown>;
    expect(writes[0]?.op).toBe("create");
    expect(data.status).toBe("open");
    expect(Number(data.hours)).toBe(0);
    expect(data.source).toBe("zalo_app");
    // The stamp is the server's — a "HH:mm" the DTO validator would accept back.
    expect(data.start_time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    expect(data.end_time).toBeUndefined();
  });

  test("a shift already running is a 409, even on another công trình", async () => {
    const { prisma, writes } = clockFake({
      open: { id: 5, project_id: 99, status: "open" },
    });
    await expect(clockIn(prisma, 1, 2)).rejects.toThrow(/chưa chấm công ra/);
    expect(writes).toHaveLength(0);
  });

  test("a second clock-in the same day is a 409 pointing at đơn bù công", async () => {
    const { prisma, writes } = clockFake({
      today: { id: 6, status: "pending" },
    });
    await expect(clockIn(prisma, 1, 2)).rejects.toThrow(/đơn bù công/);
    expect(writes).toHaveLength(0);
  });

  test("an unassigned worker is a 403 before anything is read or written", async () => {
    const writes: unknown[] = [];
    const prisma = {
      assignment: { findFirst: async () => null },
      timekeepingRecord: {
        findFirst: async () => {
          throw new Error("must not look for a shift before the 403");
        },
        create: async () => {
          writes.push(1);
        },
      },
    } as unknown as PrismaService;
    await expect(clockIn(prisma, 1, 2)).rejects.toThrow(/không được phân công/);
    expect(writes).toHaveLength(0);
  });
});

describe("clockOut", () => {
  test("closes the open shift as pending with a stamped end", async () => {
    const { prisma, writes } = clockFake({
      open: {
        id: 7,
        project_id: 2,
        status: "open",
        work_date: day("2026-08-05"),
        start_time: "07:30",
      },
    });
    await clockOut(prisma, 1);
    const data = writes[0]?.args.data as Record<string, unknown>;
    expect(writes[0]?.op).toBe("update");
    expect(data.status).toBe("pending");
    expect(data.end_time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });

  // The trap: businessToday() at 01:00 is the NEXT day, so recomputing work_date
  // here would file the shift under a day the worker never clocked in on.
  test("never writes work_date — the shift keeps the day it started", async () => {
    const { prisma, writes } = clockFake({
      open: {
        id: 7,
        project_id: 2,
        status: "open",
        work_date: day("2026-08-05"),
        start_time: "22:00",
      },
    });
    await clockOut(prisma, 1);
    const data = writes[0]?.args.data as Record<string, unknown>;
    expect(data.work_date).toBeUndefined();
    expect(writes[0]?.args.where).toEqual({ id: 7 });
  });

  test("an abandoned shift is capped and flagged", async () => {
    const { prisma, writes } = clockFake({
      open: {
        id: 7,
        project_id: 2,
        status: "open",
        // Long in the past, so "now" is always far past the cap.
        work_date: day("2026-08-05"),
        start_time: "07:30",
      },
    });
    await clockOut(prisma, 1);
    const data = writes[0]?.args.data as Record<string, unknown>;
    expect(Number(data.hours)).toBe(16);
    expect(data.flag).toBe("over_cap");
  });

  test("with no shift at all it is a 404", async () => {
    const { prisma, writes } = clockFake();
    await expect(clockOut(prisma, 1)).rejects.toThrow(/chưa chấm công vào/);
    expect(writes).toHaveLength(0);
  });

  // A lost response makes the worker tap again; the shift is already closed, so
  // the retry is a success and must not send them to the office.
  test("a retry after the response was lost returns today's closed row", async () => {
    const { prisma, writes } = clockFake({
      today: { id: 7, status: "pending", hours: 9.5, remedy_reason: null },
    });
    const result = await clockOut(prisma, 1);
    expect(result).toMatchObject({ id: 7, status: "pending" });
    expect(writes).toHaveLength(0);
  });
});

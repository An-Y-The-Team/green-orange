// Assignment FK + crew-status guards (F11 / F26) and the chấm công summary
// aggregate, unit-tested without a DB (bun test) — same fake-prisma pattern as
// receivables.test.ts. What must not regress: an unknown id is a 400 naming the
// field (not the FK's misleading 409), a member who has left cannot take a new
// assignment, create/update share one assertion so they can't drift, and a
// member+day holding both a manual and a zalo_app row counts ONCE with the
// manual hours (the grid shows one number for it, so the total must too).
import { describe, expect, test } from "bun:test";
import type { Response } from "express";

import { TOTAL_COUNT_HEADER } from "../common/pagination";
import type { PrismaService } from "../prisma/prisma.service";
import {
  CrewController,
  assertAssignmentRefs,
  timekeepingSummary,
} from "./crew.module";

const fake = (
  members: { id: number; status: string }[],
  roles: { id: number }[]
) =>
  ({
    crewMember: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        members.find((m) => m.id === where.id) ?? null,
    },
    crewRole: {
      findUnique: async ({ where }: { where: { id: number } }) =>
        roles.find((r) => r.id === where.id) ?? null,
    },
  }) as unknown as PrismaService;

const prisma = fake(
  [
    { id: 1, status: "working" },
    { id: 2, status: "left" },
    { id: 3, status: "on_leave" },
  ],
  [{ id: 10 }]
);

describe("assertAssignmentRefs", () => {
  test("working member + existing role passes", async () => {
    await expect(
      assertAssignmentRefs(prisma, { crew_member_id: 1, role_id: 10 })
    ).resolves.toBeUndefined();
  });

  test("unknown crew_member_id is a 400 naming the field", async () => {
    await expect(
      assertAssignmentRefs(prisma, { crew_member_id: 99 })
    ).rejects.toThrow(/crew_member_id does not exist/);
  });

  test("unknown role_id is a 400 naming the field", async () => {
    await expect(
      assertAssignmentRefs(prisma, { crew_member_id: 1, role_id: 99 })
    ).rejects.toThrow(/role_id does not exist/);
  });

  test("a member who has left cannot be assigned", async () => {
    await expect(
      assertAssignmentRefs(prisma, { crew_member_id: 2 })
    ).rejects.toThrow(/status "working"/);
  });

  test("an on-leave member cannot be assigned either", async () => {
    await expect(
      assertAssignmentRefs(prisma, { crew_member_id: 3 })
    ).rejects.toThrow(/status "working"/);
  });

  // PATCH sends only what changed: editing the dates of a historical row whose
  // member has since left must stay possible.
  test("omitted fields are not checked", async () => {
    await expect(assertAssignmentRefs(prisma, {})).resolves.toBeUndefined();
  });

  // role_id: null clears the override — nothing to look up.
  test("role_id null is accepted", async () => {
    await expect(
      assertAssignmentRefs(prisma, { crew_member_id: 1, role_id: null })
    ).resolves.toBeUndefined();
  });
});

// A groupBy row as Prisma returns it: work_date is a Date (@db.Date → UTC
// midnight) and the summed hours arrive under `_sum`.
type Group = {
  crew_member_id: number;
  work_date: Date;
  source: string;
  _sum: { hours: number };
};

const group = ({
  member,
  date,
  source,
  hours,
}: {
  member: number;
  date: string;
  source: string;
  hours: number;
}): Group => ({
  crew_member_id: member,
  work_date: new Date(`${date}T00:00:00.000Z`),
  source,
  _sum: { hours },
});

// Captures the groupBy args so a test can assert the project filter reached it.
const fakeTimekeeping = (groups: Group[]) => {
  const calls: Record<string, unknown>[] = [];
  const prismaDouble = {
    timekeepingRecord: {
      groupBy: async (args: Record<string, unknown>) => {
        calls.push(args);
        return groups;
      },
    },
  } as unknown as PrismaService;
  return { prisma: prismaDouble, calls };
};

const summarize = (groups: Group[]) =>
  timekeepingSummary(fakeTimekeeping(groups).prisma, 7);

describe("timekeepingSummary (manual wins over zalo_app)", () => {
  test("empty project is zeros, not nulls", async () => {
    expect(await summarize([])).toEqual({
      project_id: 7,
      total_hours: 0,
      recorded_days: 0,
    });
  });

  test("sums every member+day and counts distinct days", async () => {
    const summary = await summarize([
      group({ member: 1, date: "2026-07-01", source: "manual", hours: 8 }),
      group({ member: 2, date: "2026-07-01", source: "manual", hours: 4 }),
      group({ member: 1, date: "2026-07-02", source: "manual", hours: 7.5 }),
    ]);
    expect(summary.total_hours).toBe(19.5);
    // Two members on 07-01 are ONE recorded day, same as the grid's column.
    expect(summary.recorded_days).toBe(2);
  });

  // The crux: the grid renders `manual?.hours ?? zalo?.hours`, so a hand-corrected
  // day displays 8 while holding two rows. A naive SUM(hours) would say 14.
  test("a member+day with both manual and zalo_app counts once, manual hours", async () => {
    const summary = await summarize([
      group({ member: 1, date: "2026-07-01", source: "manual", hours: 8 }),
      group({ member: 1, date: "2026-07-01", source: "zalo_app", hours: 6 }),
    ]);
    expect(summary.total_hours).toBe(8);
    expect(summary.recorded_days).toBe(1);
  });

  // Postgres returns groups unordered, so the rule must not depend on which row
  // is seen first.
  test("…and still counts once when the zalo_app row comes first", async () => {
    const summary = await summarize([
      group({ member: 1, date: "2026-07-01", source: "zalo_app", hours: 6 }),
      group({ member: 1, date: "2026-07-01", source: "manual", hours: 8 }),
    ]);
    expect(summary.total_hours).toBe(8);
  });

  // A lone zalo_app row is what the grid shows read-only — it is real work.
  test("a lone zalo_app row counts in full", async () => {
    const summary = await summarize([
      group({ member: 1, date: "2026-07-01", source: "zalo_app", hours: 6 }),
      group({ member: 2, date: "2026-07-01", source: "manual", hours: 8 }),
    ]);
    expect(summary.total_hours).toBe(14);
    expect(summary.recorded_days).toBe(1);
  });

  // Precedence is per member+day: member 2's zalo row must not be shadowed by
  // member 1's manual row on the same date.
  test("manual on one member does not shadow another member's zalo row", async () => {
    const summary = await summarize([
      group({ member: 1, date: "2026-07-01", source: "manual", hours: 8 }),
      group({ member: 1, date: "2026-07-01", source: "zalo_app", hours: 5 }),
      group({ member: 2, date: "2026-07-01", source: "zalo_app", hours: 5 }),
    ]);
    expect(summary.total_hours).toBe(13);
  });

  test("float noise is rounded away", async () => {
    const summary = await summarize([
      group({ member: 1, date: "2026-07-01", source: "manual", hours: 7.1 }),
      group({ member: 1, date: "2026-07-02", source: "manual", hours: 8.2 }),
    ]);
    expect(summary.total_hours).toBe(15.3);
  });

  test("only the requested project is aggregated", async () => {
    const { prisma, calls } = fakeTimekeeping([]);
    await timekeepingSummary(prisma, 42);
    expect(calls[0]?.where).toEqual({ project_id: 42 });
  });
});

// X-Total-Count on a paginated list (GET /crew stands in for all 15 — they share
// one `withTotalCount` helper). What must not regress: the header is the total of
// the FILTERED collection, not the length of the page and not the whole table.
describe("GET /crew → X-Total-Count", () => {
  const roster = [
    { id: 1, status: "working" },
    { id: 2, status: "working" },
    { id: 3, status: "left" },
  ];

  // Applies `where.status` and `take` the way Postgres would, so a page shorter
  // than the total is a real case here rather than a hypothetical.
  const listCrew = async ({
    status,
    limit,
  }: {
    status?: string;
    limit?: string;
  }) => {
    const wheres: unknown[] = [];
    const headers: Record<string, unknown> = {};
    const match = (where: { status?: { in: string[] } }) =>
      roster.filter((m) => !where.status || where.status.in.includes(m.status));
    const prisma = {
      crewMember: {
        findMany: async ({
          where,
          take,
        }: {
          where: { status?: { in: string[] } };
          take: number;
        }) => {
          wheres.push(where);
          return match(where).slice(0, take);
        },
        count: async ({ where }: { where: { status?: { in: string[] } } }) => {
          wheres.push(where);
          return match(where).length;
        },
      },
    } as unknown as PrismaService;
    const res = {
      setHeader: (key: string, value: unknown) => (headers[key] = value),
    } as unknown as Response;
    // The handler takes the DTO post-ValidationPipe, so csv params arrive as
    // arrays here (the pipe itself is covered in common/list-query.test.ts).
    const rows = await new CrewController(prisma).list(res, {
      limit,
      status: status ? [status] : undefined,
    });
    return { rows, wheres, total: headers[TOTAL_COUNT_HEADER] };
  };

  test("a filtered list reports the FILTERED total, not the table total", async () => {
    const { total } = await listCrew({ status: "working" });
    expect(total).toBe(2); // not 3 — the member who left is filtered out
  });

  test("the total is the collection's, not the page's length", async () => {
    const { rows, total } = await listCrew({ status: "working", limit: "1" });
    expect(rows).toHaveLength(1);
    expect(total).toBe(2);
  });

  // The divergence bug: two separately-built `where`s drift the moment a filter
  // changes, and the number silently describes a different query than the rows.
  test("the count runs the SAME where object as the rows", async () => {
    const { wheres } = await listCrew({ status: "working" });
    expect(wheres).toHaveLength(2);
    expect(wheres[0]).toBe(wheres[1]);
  });

  test("unfiltered: every row is counted", async () => {
    expect((await listCrew({})).total).toBe(3);
  });
});

describe("crew list — search and sort", () => {
  // The captured Prisma call args — only what the assertions read. The list
  // DTO isn't exported; the handler signature carries it.
  type ListArgs = { where: Record<string, unknown>; orderBy: unknown };
  type ListQuery = Parameters<CrewController["list"]>[1];

  const capture = () => {
    const findMany: ListArgs[] = [];
    const prisma = {
      crewMember: {
        findMany: async (args: ListArgs) => {
          findMany.push(args);
          return [];
        },
        count: async () => 0,
      },
    } as unknown as PrismaService;
    const res = { setHeader: () => undefined } as unknown as Response;
    return {
      findMany,
      list: (q: ListQuery) => new CrewController(prisma).list(res, q),
    };
  };

  test("search ORs name and phone; role_id csv lands as `in`", async () => {
    const { findMany, list } = capture();
    await list({ search: "0903", role_id: [1, 2] });
    expect(findMany[0]?.where.OR).toEqual([
      { name: { contains: "0903", mode: "insensitive" } },
      { phone: { contains: "0903", mode: "insensitive" } },
    ]);
    expect(findMany[0]?.where.default_role_id).toEqual({ in: [1, 2] });
  });

  test("whitelisted sort gets the id tiebreak; none keeps name asc", async () => {
    const { findMany, list } = capture();
    await list({ sort_by: "created_at", sort_order: "desc" });
    await list({});
    expect(findMany[0]?.orderBy).toEqual([
      { created_at: "desc" },
      { id: "desc" },
    ]);
    expect(findMany[1]?.orderBy).toEqual([{ name: "asc" }, { id: "asc" }]);
  });
});

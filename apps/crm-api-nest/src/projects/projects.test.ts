// Cross-entity ownership guards (F10) + single-write create (F14), unit-tested
// against a fake Prisma — no DB. The HTTP roundtrip is the README smoke check.
import { describe, expect, test } from "bun:test";
import type { Response } from "express";

import { STAGE_ORDER } from "../common/stage";
import type { PrismaService } from "../prisma/prisma.service";
import { AttachmentsController, ProjectsController } from "./projects.module";

describe("project create — contacts must belong to the client", () => {
  // Location 5 belongs to client 1; contact 42 belongs to `contactClientId`.
  const fake = (contactClientId: number): any => {
    const created: unknown[] = [];
    return {
      created,
      location: {
        findUnique: async () => ({
          id: 5,
          client_id: 1,
          manager_contact_id: 9,
        }),
      },
      contact: {
        findUnique: async () => ({ id: 42, client_id: contactClientId }),
      },
      project: { aggregate: async () => ({ _max: { id: 3 } }) },
      $transaction: async (fn: any) =>
        fn({
          project: {
            create: async ({ data }: any) => {
              created.push(data);
              return { id: 4, ...data };
            },
          },
          paperworkItem: { createMany: async () => undefined },
        }),
    };
  };

  const dto = (extra: object) =>
    ({
      name: "Nhà anh A",
      client_id: 1,
      location_id: 5,
      type_ids: [1],
      ...extra,
    }) as any;

  test("another client's working_contact_id → 400, nothing written", async () => {
    const prisma = fake(2);
    await expect(
      new ProjectsController(prisma).create(dto({ working_contact_id: 42 }))
    ).rejects.toThrow(
      /working_contact_id must be a contact of the same client/
    );
    expect(prisma.created).toEqual([]);
  });

  test("another client's decision_maker_contact_id → 400", async () => {
    const prisma = fake(2);
    await expect(
      new ProjectsController(prisma).create(
        dto({ decision_maker_contact_id: 42 })
      )
    ).rejects.toThrow(/decision_maker_contact_id must be/);
    expect(prisma.created).toEqual([]);
  });

  test("no contact and no location manager → created with null contacts", async () => {
    const prisma = fake(1);
    prisma.location.findUnique = async () => ({
      id: 5,
      client_id: 1,
      manager_contact_id: null,
    });
    await new ProjectsController(prisma).create(dto({}));
    const data = prisma.created[0] as Record<string, unknown>;
    expect(data.working_contact_id).toBeNull();
    expect(data.decision_maker_contact_id).toBeNull();
  });

  test("own contact + appointment_at persists in ONE write (F14)", async () => {
    const prisma = fake(1);
    await new ProjectsController(prisma).create(
      dto({
        working_contact_id: 42,
        appointment_at: "2026-07-30T02:00:00.000Z",
      })
    );
    expect(prisma.created).toHaveLength(1);
    const data = prisma.created[0] as Record<string, unknown>;
    expect(data.working_contact_id).toBe(42);
    expect(data.appointment_at).toEqual(new Date("2026-07-30T02:00:00.000Z"));
  });
});

describe("project list — filters, search, sort", () => {
  // The captured Prisma call args — only what the assertions read. The list
  // DTO isn't exported; the handler signature carries it.
  type ListArgs = { where: Record<string, unknown>; orderBy: unknown };
  type ListQuery = Parameters<ProjectsController["list"]>[1];

  const capture = () => {
    const findMany: ListArgs[] = [];
    const counts: ListArgs[] = [];
    const prisma = {
      project: {
        findMany: async (args: ListArgs) => {
          findMany.push(args);
          return [];
        },
        count: async (args: ListArgs) => {
          counts.push(args);
          return 0;
        },
      },
    } as unknown as PrismaService;
    const res = { setHeader: () => undefined } as unknown as Response;
    return {
      findMany,
      counts,
      list: (q: ListQuery) => new ProjectsController(prisma).list(res, q),
    };
  };

  test("stage/status csv land as `in` on BOTH queries", async () => {
    const { findMany, counts, list } = capture();
    await list({ stage: ["request", "quote"], status: ["active", "on_hold"] });
    expect(findMany[0]?.where.stage).toEqual({ in: ["request", "quote"] });
    expect(findMany[0]?.where.status).toEqual({ in: ["active", "on_hold"] });
    expect(counts[0]?.where).toBe(findMany[0]?.where as never);
  });

  test("search ORs name, code and the client's name", async () => {
    const { findMany, list } = capture();
    await list({ search: "villa" });
    expect(findMany[0]?.where.OR).toEqual([
      // Names go through the diacritic-insensitive column; the code is ASCII.
      { name_norm: { contains: "villa" } },
      { code: { contains: "villa", mode: "insensitive" } },
      { client: { name_norm: { contains: "villa" } } },
    ]);
  });

  test("whitelisted sort gets the id tiebreak; none keeps id desc", async () => {
    const { findMany, list } = capture();
    await list({ sort_by: "appointment_at", sort_order: "asc" });
    await list({});
    expect(findMany[0]?.orderBy).toEqual([
      { appointment_at: "asc" },
      { id: "desc" },
    ]);
    expect(findMany[1]?.orderBy).toEqual([{ id: "desc" }]);
  });
});

describe("attachment create — paperwork item must belong to the project", () => {
  const fake = (itemProjectId: number): any => ({
    project: { findUnique: async () => ({ stage: "execution" }) },
    paperworkItem: {
      findUnique: async () => ({ id: 8, project_id: itemProjectId }),
    },
    attachment: { create: async ({ data }: any) => ({ id: 1, ...data }) },
  });

  const dto = {
    project_id: 3,
    kind: "paperwork",
    paperwork_item_id: 8,
    s3_key: "k",
  } as any;

  test("another project's paperwork_item_id → 400", async () => {
    await expect(
      new AttachmentsController(fake(99)).create(dto)
    ).rejects.toThrow(/paperwork_item_id does not belong to project_id/);
  });

  test("own paperwork item is accepted", async () => {
    const row = await new AttachmentsController(fake(3)).create(dto);
    expect(row.paperwork_item_id).toBe(8);
  });
});

// The dashboard's Pipeline block renders these eight columns directly, so what
// must not regress: every stage is present and in pipeline order (an absent
// stage would silently drop a column), and `deal_total` is the CHỐT quote sum
// per stage — not whatever was quoted last.
describe("GET /projects/summary (pipeline rollup)", () => {
  const fake = ({
    counts = [] as { stage: string; count: number }[],
    dealQuotes = [] as { stage: string | null; total: bigint }[],
  }) => {
    const wheres: any[] = [];
    return {
      wheres,
      prisma: {
        project: {
          groupBy: async ({ where }: any) => {
            wheres.push(["project.groupBy", where]);
            return counts.map((c) => ({
              stage: c.stage,
              _count: { _all: c.count },
            }));
          },
        },
        quote: {
          findMany: async ({ where }: any) => {
            wheres.push(["quote.findMany", where]);
            return dealQuotes.map((q) => ({
              total_amount: q.total,
              project: q.stage === null ? null : { stage: q.stage },
            }));
          },
        },
      } as any,
    };
  };

  test("returns all eight stages, in pipeline order", async () => {
    const { prisma } = fake({});
    const out = await new ProjectsController(prisma).summary();
    expect(out.map((r) => r.stage)).toEqual([...STAGE_ORDER]);
    expect(out.every((r) => r.count === 0 && r.deal_total === 0)).toBe(true);
  });

  test("sums the chốt quotes of each stage", async () => {
    const { prisma } = fake({
      counts: [
        { stage: "quote", count: 3 },
        { stage: "contract", count: 1 },
      ],
      dealQuotes: [
        { stage: "quote", total: 10_000_000n },
        { stage: "quote", total: 26_000_000n },
        { stage: "contract", total: 5_000_000n },
      ],
    });
    const out = await new ProjectsController(prisma).summary();
    const byStage = Object.fromEntries(out.map((r) => [r.stage, r]));
    expect(byStage.quote).toEqual({
      stage: "quote",
      count: 3,
      deal_total: 36_000_000,
    });
    expect(byStage.contract!.deal_total).toBe(5_000_000);
    // A stage with projects but no chốt quote is 0, not undefined.
    expect(byStage.closed).toEqual({
      stage: "closed",
      count: 0,
      deal_total: 0,
    });
  });

  test("counts only active projects, and only their deal quotes", async () => {
    const { prisma, wheres } = fake({});
    await new ProjectsController(prisma).summary();
    const [, countWhere] = wheres.find(([k]) => k === "project.groupBy")!;
    const [, quoteWhere] = wheres.find(([k]) => k === "quote.findMany")!;
    expect(countWhere).toEqual({ status: "active" });
    expect(quoteWhere.status).toBe("deal");
    expect(quoteWhere.project).toEqual({ status: "active" });
  });

  test("a quote whose project vanished is skipped, not counted as a stage", async () => {
    const { prisma } = fake({ dealQuotes: [{ stage: null, total: 999n }] });
    const out = await new ProjectsController(prisma).summary();
    expect(out.reduce((sum, r) => sum + r.deal_total, 0)).toBe(0);
  });
});

describe("project detail — nested quotes carry their send logs", () => {
  // The stage-2 panel prints "Gửi: Zalo 08/09" off project.quotes[].send_logs.
  // Prisma omits a relation that isn't included, so dropping the include makes
  // the field absent rather than empty and the panel renders a bare "Gửi:"
  // label. Mirrored by test_quotes.py::test_project_detail_carries_the_send_logs.
  test("the detail include selects send_logs", async () => {
    let args: any;
    const prisma = {
      project: {
        findUnique: async (a: any) => {
          args = a;
          return { id: 1, quotes: [] };
        },
      },
    } as unknown as PrismaService;

    await new ProjectsController(prisma).get(1);

    expect(args.include.quotes.include.send_logs).toBeDefined();
    expect(args.include.quotes.orderBy).toEqual({ version: "desc" });
  });
});

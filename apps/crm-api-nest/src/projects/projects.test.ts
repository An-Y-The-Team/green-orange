// Cross-entity ownership guards (F10) + single-write create (F14), unit-tested
// against a fake Prisma — no DB. The HTTP roundtrip is the README smoke check.
import { describe, expect, test } from "bun:test";
import type { Response } from "express";

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
      { name: { contains: "villa", mode: "insensitive" } },
      { code: { contains: "villa", mode: "insensitive" } },
      { client: { name: { contains: "villa", mode: "insensitive" } } },
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

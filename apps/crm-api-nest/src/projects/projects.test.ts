// Cross-entity ownership guards (F10) + single-write create (F14), unit-tested
// against a fake Prisma — no DB. The HTTP roundtrip is the README smoke check.
import { describe, expect, test } from "bun:test";

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

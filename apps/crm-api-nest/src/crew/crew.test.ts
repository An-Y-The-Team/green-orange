// Assignment FK + crew-status guards (F11 / F26), unit-tested without a DB
// (bun test) — same fake-prisma pattern as receivables.test.ts. What must not
// regress: an unknown id is a 400 naming the field (not the FK's misleading
// 409), a member who has left cannot take a new assignment, and create/update
// share one assertion so they can't drift.
import { describe, expect, test } from "bun:test";

import type { PrismaService } from "../prisma/prisma.service";
import { assertAssignmentRefs } from "./crew.module";

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

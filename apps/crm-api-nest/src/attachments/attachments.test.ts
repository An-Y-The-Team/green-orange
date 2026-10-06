// What must not regress: a file is recorded only against the owner its kind
// demands, linked to exactly the record its kind names (on the same project),
// and under a key minted for that owner + kind — DELETE removes the object the
// key names. Python mirror: apps/crm-api/tests/test_attachments.py.
import { describe, expect, test } from "bun:test";

import { buildKey } from "../common/storage";
import { AttachmentsController } from "./attachments.module";

describe("attachment create — owner, kind and link", () => {
  // Every link table answers "this row sits on project N"; the crew member and
  // project lookups only need to exist.
  const fake = (linkProjectId: number): any => {
    const link = {
      findUnique: async () => ({ project_id: linkProjectId }),
    };
    return {
      project: { findUnique: async () => ({ id: 3, stage: "execution" }) },
      crewMember: { findUnique: async () => ({ id: 5 }) },
      quote: link,
      contract: link,
      paymentMilestone: link,
      bill: link,
      paperworkItem: link,
      attachment: { create: async ({ data }: any) => ({ id: 1, ...data }) },
    };
  };
  const P3 = { project_id: 3 };
  const dto = (kind: string, extra: object = {}): any => ({
    ...P3,
    kind,
    s3_key: buildKey(P3, kind, "Bien ban.pdf"),
    ...extra,
  });

  test("another project's paperwork_item_id → 400", async () => {
    await expect(
      new AttachmentsController(fake(99)).create(
        dto("paperwork", { paperwork_item_id: 8 })
      )
    ).rejects.toThrow(/paperwork_item_id does not belong to project_id/);
  });

  test("each linked kind stores its own link", async () => {
    for (const [kind, link] of [
      ["paperwork", "paperwork_item_id"],
      ["signed_quote", "quote_id"],
      ["signed_contract", "contract_id"],
      ["payment_proof", "payment_milestone_id"],
      ["vat_invoice", "bill_id"],
    ]) {
      const row = await new AttachmentsController(fake(3)).create(
        dto(kind, { [link]: 8 })
      );
      expect(row[link]).toBe(8);
    }
  });

  // "Correctly ID'd": a payment proof with no milestone is unfindable later,
  // and a survey photo carrying a contract_id would show up on the contract.
  test("missing required link or a foreign link → 400", async () => {
    const c = new AttachmentsController(fake(3));
    await expect(c.create(dto("payment_proof"))).rejects.toThrow(
      /needs payment_milestone_id/
    );
    await expect(c.create(dto("survey", { contract_id: 8 }))).rejects.toThrow(
      /takes no contract_id/
    );
  });

  test("the kind decides the owner", async () => {
    const c = new AttachmentsController(fake(3));
    await expect(
      c.create({ ...dto("id_card"), project_id: 3 })
    ).rejects.toThrow(/needs crew_member_id/);
    await expect(
      c.create({ ...dto("survey"), crew_member_id: 5 })
    ).rejects.toThrow(/exactly one owner/);
    const crew = { crew_member_id: 5 };
    const row = await c.create({
      ...crew,
      kind: "id_card",
      s3_key: buildKey(crew, "id_card", "cccd.jpg"),
    } as any);
    expect(row.crew_member_id).toBe(5);
    expect(row.project_id).toBeUndefined();
  });

  // DELETE removes the object this key names, so a key the caller made up — or
  // one minted for another project or category — would let them delete someone
  // else's file while that row stays behind, showing no sign of the loss.
  test("a key not issued for this owner and kind → 400", async () => {
    for (const s3_key of [
      "k",
      buildKey({ project_id: 4 }, "survey", "x.pdf"),
      buildKey(P3, "other", "x.pdf"),
      "projects/3/survey/nope/x.pdf",
    ]) {
      await expect(
        new AttachmentsController(fake(3)).create({ ...dto("survey"), s3_key })
      ).rejects.toThrow(/s3_key was not issued for this owner and kind/);
    }
  });
});

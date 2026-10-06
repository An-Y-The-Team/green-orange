import { describe, expect, test } from "vitest";

import type { Contract } from "@/app/(dashboard)/contracts/types";
import { MilestoneType } from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";

import {
  type LinkedRecords,
  groupByKind,
  linkedRecordLabel,
  recordLabels,
} from "./uploaded-files";

const file = (id: number, kind: AttachmentKind, link = {}): Attachment => ({
  id,
  project_id: 1,
  crew_member_id: null,
  kind,
  s3_key: `projects/1/${id}.pdf`,
  created_at: "2026-10-01",
  ...link,
});

const none: LinkedRecords = {
  contracts: [],
  quotes: [],
  milestones: [],
  bills: [],
  paperworkItems: [],
};

describe("groupByKind", () => {
  test("pipeline order, empty kinds and OTHER dropped", () => {
    const groups = groupByKind([
      file(1, AttachmentKind.VAT_INVOICE),
      file(2, AttachmentKind.OTHER),
      file(3, AttachmentKind.SURVEY),
      file(4, AttachmentKind.SURVEY),
    ]);
    expect(groups.map(([k, rows]) => [k, rows.map((r) => r.id)])).toEqual([
      [AttachmentKind.SURVEY, [3, 4]],
      [AttachmentKind.VAT_INVOICE, [1]],
    ]);
  });
});

describe("linkedRecordLabel", () => {
  test("names the record the file documents", () => {
    const records: LinkedRecords = {
      ...none,
      contracts: [{ id: 7, code: "HĐ-0007" } as Contract],
      milestones: [
        { id: 3, type: MilestoneType.DEPOSIT, amount: 1 } as PaymentMilestone,
      ],
    };
    expect(
      linkedRecordLabel(
        file(1, AttachmentKind.SIGNED_CONTRACT, { contract_id: 7 }),
        records
      )
    ).toBe("HĐ-0007");
    expect(
      linkedRecordLabel(
        file(2, AttachmentKind.PAYMENT_PROOF, { payment_milestone_id: 3 }),
        records
      )
    ).toMatch(/^Cọc · /);
  });

  test("null when unlinked or the record is gone", () => {
    expect(linkedRecordLabel(file(1, AttachmentKind.SURVEY), none)).toBeNull();
    expect(
      linkedRecordLabel(
        file(2, AttachmentKind.VAT_INVOICE, { bill_id: 9 }),
        none
      )
    ).toBeNull();
  });
});

describe("recordLabels", () => {
  // The overview is where unlinked files get deleted, so an orphan (link SET
  // NULL by its parent's delete) must still be listed — just without a label.
  test("keys labels by attachment id and skips unlinked files", () => {
    const records = {
      ...none,
      contracts: [{ id: 9, code: "HĐ-0009" } as Contract],
    };
    expect(
      recordLabels(
        [
          file(1, AttachmentKind.SIGNED_CONTRACT, { contract_id: 9 }),
          file(2, AttachmentKind.SIGNED_CONTRACT),
        ],
        records
      )
    ).toEqual({ 1: "HĐ-0009" });
  });
});

import type { Contract } from "@/app/(dashboard)/contracts/types";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { MilestoneType } from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { MILESTONE_TYPES } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";

import type { PaperworkItem } from "../../../../types";

/**
 * Anchor of the Giấy tờ tab's file section — the closed panel links straight
 * to it, so the archive of a finished job is one click away.
 */
export const UPLOADED_FILES_ANCHOR = "tep-da-tai-len";

/**
 * Files grouped by kind in pipeline order (the enum's order), empty kinds
 * dropped. OTHER is left out: the view renders it as its own uploadable list.
 */
export function groupByKind(
  attachments: Attachment[]
): [AttachmentKind, Attachment[]][] {
  return Object.values(AttachmentKind)
    .filter((kind) => kind !== AttachmentKind.OTHER)
    .map((kind): [AttachmentKind, Attachment[]] => [
      kind,
      attachments.filter((a) => a.kind === kind),
    ])
    .filter(([, rows]) => rows.length > 0);
}

/** The records a file can document — whatever the page already loaded. */
export interface LinkedRecords {
  contracts: Contract[];
  quotes: Quote[];
  milestones: PaymentMilestone[];
  bills: Bill[];
  paperworkItems: PaperworkItem[];
}

/**
 * What the file belongs to, in words ("HĐ-0012", "Báo giá v2", "Cọc · …").
 * Null when it is linked to nothing, or to a record that is gone.
 */
export function linkedRecordLabel(
  a: Attachment,
  records: LinkedRecords
): string | null {
  if (a.contract_id != null) {
    return records.contracts.find((c) => c.id === a.contract_id)?.code ?? null;
  }
  if (a.quote_id != null) {
    const q = records.quotes.find((x) => x.id === a.quote_id);
    return q ? `Báo giá v${q.version}` : null;
  }
  if (a.payment_milestone_id != null) {
    const m = records.milestones.find((x) => x.id === a.payment_milestone_id);
    if (!m) return null;
    const name =
      m.type === MilestoneType.DEPOSIT ? "Cọc" : MILESTONE_TYPES[m.type];
    return `${name} · ${formatVND(m.amount)}`;
  }
  if (a.bill_id != null) {
    // Bills carry no code of their own.
    return records.bills.some((b) => b.id === a.bill_id)
      ? `Hóa đơn #${a.bill_id}`
      : null;
  }
  if (a.paperwork_item_id != null) {
    return (
      records.paperworkItems.find((p) => p.id === a.paperwork_item_id)?.name ??
      null
    );
  }
  return null;
}

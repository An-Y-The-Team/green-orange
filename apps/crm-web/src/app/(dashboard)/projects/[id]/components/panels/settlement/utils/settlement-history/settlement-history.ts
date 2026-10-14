import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { formatVND } from "@/utils/format-vnd/format-vnd";

export interface HistoryEntry {
  key: string;
  date: string;
  label: string;
}

/**
 * The money timeline, rebuilt from the dates already stored (no event log):
 * the signature, the bill going out, each đợt collected. Newest first.
 */
export function settlementHistory({
  settlement,
  bill,
  milestones,
  numbers,
}: {
  settlement?: Settlement;
  bill?: Bill | null;
  milestones: PaymentMilestone[];
  /** "Đợt N" per milestone id. */
  numbers: Map<number, number>;
}): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  if (settlement?.signed_date) {
    entries.push({
      key: "signed",
      date: settlement.signed_date,
      label: "Khách ký quyết toán",
    });
  }
  if (bill?.sent_date) {
    entries.push({
      key: "bill-sent",
      date: bill.sent_date,
      label: "Đã gửi đề nghị thanh toán",
    });
  }
  for (const m of milestones) {
    if (m.status === MilestoneStatus.PAID && m.paid_date) {
      entries.push({
        key: `milestone-${m.id}`,
        date: m.paid_date,
        label: `Đã thu đợt ${numbers.get(m.id) ?? m.id} · ${formatVND(m.amount)}`,
      });
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

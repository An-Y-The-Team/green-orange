import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";
import type { Attachment } from "@/components/attachments/types";
import { MILESTONE_TYPES } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";

import type { PaymentPlan } from "../../utils/payment-plan/payment-plan";
import { AddMilestone } from "../add-milestone/add-milestone";
import { BillRow } from "../bill-row/bill-row";
import { EditDueDate } from "../edit-due-date/edit-due-date";
import { MilestoneRow } from "../milestone-row/milestone-row";
import { ReopenSettlement } from "../reopen-settlement/reopen-settlement";

/**
 * Bước 4: collect the money. The đợt in order (the next one carries the stage's
 * one primary), the hóa đơn block, and the rarely-needed fixes behind a native
 * `<details>`, so a closed job's disabled fieldset cannot lock them out of view.
 */
export function StepCollect({
  settlementId,
  bill,
  milestones,
  plan,
  projectId,
  attachments,
}: {
  settlementId: number;
  bill?: Bill | null;
  /** Unallocated deposit(s) first, then the bill's đợt. */
  milestones: PaymentMilestone[];
  plan: PaymentPlan;
  projectId: number;
  attachments: Attachment[];
}) {
  const unpaid = milestones.filter((m) => m.status !== MilestoneStatus.PAID);
  const locked =
    bill?.status === BillStatus.PAID ||
    milestones.some(
      (m) =>
        m.bill_id === bill?.id &&
        m.status === MilestoneStatus.PAID &&
        m.type !== MilestoneType.DEPOSIT
    );

  return (
    <div className="space-y-3">
      {milestones.length > 0 ? (
        <div className="space-y-2">
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              plan={plan}
              billId={bill?.id}
              projectId={projectId}
              attachments={attachments}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có đợt thanh toán. Dùng “Thêm đợt” ở phần Thêm bên dưới.
        </p>
      )}

      {bill ? (
        <BillRow bill={bill} projectId={projectId} attachments={attachments} />
      ) : null}

      <details className="group">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Thêm… (sửa hạn, thêm đợt, mở lại quyết toán)
        </summary>
        <div className="mt-2 space-y-3">
          {unpaid.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span>
                {MILESTONE_TYPES[m.type] ?? m.type} · {formatVND(m.amount)}
              </span>
              <EditDueDate milestone={m} projectId={projectId} />
            </div>
          ))}
          {bill ? (
            <AddMilestone projectId={projectId} billId={bill.id} />
          ) : null}
          <ReopenSettlement settlementId={settlementId} locked={locked} />
        </div>
      </details>
    </div>
  );
}

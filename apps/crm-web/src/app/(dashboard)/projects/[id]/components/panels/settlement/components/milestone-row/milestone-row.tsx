import { Badge } from "@yan/ui/components/badge";
import { cn } from "@yan/ui/lib/utils";

import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import {
  ATTACHMENT_KINDS,
  MILESTONE_STATUSES,
  MILESTONE_TYPES,
  OVERDUE_LABEL,
} from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { isOverdue } from "@/utils/is-overdue/is-overdue";

import type { PaymentPlan } from "../../utils/payment-plan/payment-plan";
import { RecordMilestonePaid } from "../record-milestone-paid/record-milestone-paid";

/**
 * One đợt thanh toán in the Thu tiền step. Three looks: paid (a record), next
 * (boxed, with the one pay button) and later (muted, nothing to press yet, so
 * the money order is obvious).
 */
export function MilestoneRow({
  milestone,
  plan,
  billId,
  projectId,
  attachments,
}: {
  milestone: PaymentMilestone;
  plan: PaymentPlan;
  billId?: number | null;
  projectId: number;
  attachments: Attachment[];
}) {
  const paid = milestone.status === MilestoneStatus.PAID;
  const isNext = plan.next?.id === milestone.id;
  const number = plan.numbers.get(milestone.id) ?? milestone.id;
  const nextNumber = plan.next ? plan.numbers.get(plan.next.id) : undefined;
  const late = isOverdue(milestone.due_date, paid);
  const type = MILESTONE_TYPES[milestone.type] ?? milestone.type;

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3 text-sm",
        isNext && "border-2 border-now",
        !paid && !isNext && "text-muted-foreground"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{type}</span>
        <span className="tabular-nums">{formatVND(milestone.amount)}</span>
        {!paid && milestone.due_date ? (
          <span className="text-muted-foreground">
            hạn {formatDate(milestone.due_date)}
          </span>
        ) : null}
        {paid ? (
          <Badge variant={MILESTONE_STATUSES[MilestoneStatus.PAID].variant}>
            Đã thu {formatDate(milestone.paid_date)}
          </Badge>
        ) : null}
        {isNext ? (
          <Badge
            variant={
              MILESTONE_STATUSES[MilestoneStatus.AWAITING_PAYMENT].variant
            }
          >
            {MILESTONE_STATUSES[MilestoneStatus.AWAITING_PAYMENT].label}
          </Badge>
        ) : null}
        {late ? (
          <Badge variant={OVERDUE_LABEL.variant}>{OVERDUE_LABEL.label}</Badge>
        ) : null}
        {!paid && !isNext && nextNumber ? (
          <span className="ml-auto">làm sau đợt {nextNumber}</span>
        ) : null}
      </div>

      {isNext ? (
        <RecordMilestonePaid
          milestone={milestone}
          number={number}
          projectId={projectId}
          billId={billId}
          isLast={plan.isLast}
          remainingAfter={plan.remainingAfter}
        />
      ) : null}

      <AttachmentList
        compact
        owner={{ project_id: projectId }}
        kind={AttachmentKind.PAYMENT_PROOF}
        link={{ payment_milestone_id: milestone.id }}
        initial={attachments.filter(
          (a) =>
            a.kind === AttachmentKind.PAYMENT_PROOF &&
            a.payment_milestone_id === milestone.id
        )}
        title={ATTACHMENT_KINDS[AttachmentKind.PAYMENT_PROOF]}
        target={`${type} ${formatVND(milestone.amount)}`}
        emptyMessage="Chưa có chứng từ. Thêm ủy nhiệm chi hoặc ảnh chuyển khoản nếu có."
      />
    </div>
  );
}

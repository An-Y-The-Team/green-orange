"use client";

import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { markMilestonePaid } from "@/app/(dashboard)/receivables/actions/milestones";
import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import {
  FIELDS,
  MILESTONE_STATUSES,
  MILESTONE_TYPES,
  OVERDUE_LABEL,
} from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";

/** One đợt thanh toán inside the settlement card, with an inline "đã thu" confirm. */
export function MilestoneRow({
  milestone,
  projectId,
}: {
  milestone: PaymentMilestone;
  projectId: number;
}) {
  const [paidDate, setPaidDate] = useState(todayISO);
  const paid = milestone.status === MilestoneStatus.PAID;
  const late = isOverdue(milestone.due_date, paid);
  // Overdue is derived and sits BESIDE the status, never instead of it — as the
  // only badge it hid whether an overdue đợt was chờ thanh toán or chưa đến hạn.
  const status = labelOf(MILESTONE_STATUSES, milestone.status);
  const type = MILESTONE_TYPES[milestone.type] ?? milestone.type;

  const [pending, run] = useRun(
    markMilestonePaid.bind(null, milestone.id, projectId, milestone.status)
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{type}</span>
      <span className="tabular-nums">{formatVND(milestone.amount)}</span>
      {milestone.due_date ? (
        <span className="text-muted-foreground">
          hạn {formatDate(milestone.due_date)}
        </span>
      ) : null}
      <Badge variant={status.variant}>{status.label}</Badge>
      {late ? (
        <Badge variant={OVERDUE_LABEL.variant}>{OVERDUE_LABEL.label}</Badge>
      ) : null}
      {paid && milestone.paid_date ? (
        <span className="text-muted-foreground">
          {formatDate(milestone.paid_date)}
        </span>
      ) : null}

      {!paid ? (
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm" className="ml-auto">
              Ghi nhận đã thu
            </Button>
          }
          title="Ghi nhận đã thu"
          consequence={`Ghi nhận đã thu ${formatVND(milestone.amount)} cho đợt ${type}. Sau khi ghi nhận chỉ sửa được ngày thu, không bỏ được trạng thái.`}
          pending={pending}
          confirmDisabled={!paidDate}
          onConfirm={() => run({ paid_date: paidDate })}
        >
          <div className="space-y-1">
            <Label htmlFor={`paid-${milestone.id}`}>{FIELDS.collectDate}</Label>
            <DateInput
              id={`paid-${milestone.id}`}
              value={paidDate}
              onChange={setPaidDate}
            />
          </div>
        </ConfirmAction>
      ) : null}
    </div>
  );
}

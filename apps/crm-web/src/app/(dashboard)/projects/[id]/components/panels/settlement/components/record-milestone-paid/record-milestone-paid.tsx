"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { markMilestonePaid } from "@/app/(dashboard)/receivables/actions/milestones";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { FIELDS, MILESTONE_TYPES } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { todayISO } from "@/utils/today-iso/today-iso";

import { gateButtonProps } from "../../../../../utils/gate-button-props/gate-button-props";

/**
 * "Ghi nhận đã thu" for one đợt, with its collect-date confirm. One
 * implementation for both places it appears: the milestone row (outline) and
 * the Quyết toán checklist's "Thu đủ các đợt" row, where it is the stage's
 * next step (`primary`, green) and names the đợt it records.
 */
export function RecordMilestonePaid({
  milestone,
  projectId,
  primary,
  label = "Ghi nhận đã thu",
}: {
  milestone: PaymentMilestone;
  projectId: number;
  primary: boolean;
  label?: string;
}) {
  const [paidDate, setPaidDate] = useState(todayISO);
  const type = MILESTONE_TYPES[milestone.type] ?? milestone.type;
  // markMilestonePaid walks not_due → awaiting_payment → paid itself, so the
  // caller never has to know the step rule.
  const [pending, run] = useRun(
    markMilestonePaid.bind(null, milestone.id, projectId, milestone.status)
  );

  // Confirm — records the đợt as collected on the chosen date.
  const handleConfirm = () => run({ paid_date: paidDate });

  return (
    <ConfirmAction
      trigger={<Button {...gateButtonProps(primary)}>{label}</Button>}
      title="Ghi nhận đã thu"
      consequence={`Ghi nhận đã thu ${formatVND(milestone.amount)} cho đợt ${type}. Sau khi ghi nhận chỉ sửa được ngày thu, không bỏ được trạng thái.`}
      pending={pending}
      confirmDisabled={!paidDate}
      onConfirm={handleConfirm}
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
  );
}

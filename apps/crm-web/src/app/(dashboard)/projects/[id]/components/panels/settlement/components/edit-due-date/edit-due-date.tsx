"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { updateMilestone } from "@/app/(dashboard)/receivables/actions/milestones";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { ACTIONS, FIELDS, MILESTONE_TYPES } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";

/** "Sửa hạn" for one unpaid đợt. Hạn is otherwise only set when the đợt is created. */
export function EditDueDate({
  milestone,
  projectId,
}: {
  milestone: PaymentMilestone;
  projectId: number;
}) {
  const type = MILESTONE_TYPES[milestone.type] ?? milestone.type;
  const [dueDate, setDueDate] = useState(milestone.due_date ?? "");
  const [pending, run] = useRun(
    updateMilestone.bind(null, milestone.id, projectId)
  );

  // Confirm: saves the new hạn.
  const handleConfirm = () => run({ due_date: dueDate });

  return (
    <ConfirmAction
      trigger={
        <Button
          variant="outline"
          size="sm"
          aria-label={`${ACTIONS.editDueDate} ${type} ${formatVND(milestone.amount)}`}
        >
          {ACTIONS.editDueDate}
        </Button>
      }
      title={ACTIONS.editDueDate}
      consequence={`Đổi ${FIELDS.dueDate.toLowerCase()} của đợt ${type} · ${formatVND(milestone.amount)}.`}
      pending={pending}
      confirmDisabled={!dueDate}
      onConfirm={handleConfirm}
    >
      <div className="space-y-1">
        <Label htmlFor={`due-${milestone.id}`}>{FIELDS.dueDate}</Label>
        <DateInput
          id={`due-${milestone.id}`}
          value={dueDate}
          onChange={setDueDate}
        />
      </div>
    </ConfirmAction>
  );
}

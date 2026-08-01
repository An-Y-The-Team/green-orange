"use client";

import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";

import { markMilestonePaid } from "@/app/(dashboard)/receivables/actions/milestones";
import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import {
  ACTIONS,
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
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(todayISO);
  const paid = milestone.status === MilestoneStatus.PAID;
  const late = isOverdue(milestone.due_date, paid);
  const badge = late
    ? OVERDUE_LABEL
    : labelOf(MILESTONE_STATUSES, milestone.status);

  const [pending, run] = useRun(
    markMilestonePaid.bind(null, milestone.id, projectId, milestone.status),
    () => setOpen(false)
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">
        {MILESTONE_TYPES[milestone.type] ?? milestone.type}
      </span>
      <span className="tabular-nums">{formatVND(milestone.amount)}</span>
      {milestone.due_date ? (
        <span className="text-muted-foreground">
          hạn {formatDate(milestone.due_date)}
        </span>
      ) : null}
      <Badge variant={badge.variant}>{badge.label}</Badge>
      {paid && milestone.paid_date ? (
        <span className="text-muted-foreground">
          {formatDate(milestone.paid_date)}
        </span>
      ) : null}

      {!paid ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setOpen(true)}
          >
            Ghi nhận đã thu
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ghi nhận đã thu</DialogTitle>
              </DialogHeader>
              <div className="space-y-1">
                <Label htmlFor={`paid-${milestone.id}`}>
                  {FIELDS.collectDate}
                </Label>
                <DateInput
                  id={`paid-${milestone.id}`}
                  value={paidDate}
                  onChange={setPaidDate}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {ACTIONS.close}
                </Button>
                <Button
                  disabled={pending || !paidDate}
                  onClick={() => run({ paid_date: paidDate })}
                >
                  {ACTIONS.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

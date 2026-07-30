"use client";

import Link from "next/link";
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
import { TableCell, TableRow } from "@yan/ui/components/table";

import {
  BILL_STATUSES,
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

import { markMilestonePaid } from "../actions/milestones";
import { updateBill } from "../actions/update-bill";
import { BILL_ORDER } from "../constants";
import { BillStatus, MilestoneStatus } from "../enums";
import type { Bill, PaymentMilestone } from "../types";

export function MilestoneRow({
  milestone,
  projectCode,
}: {
  milestone: PaymentMilestone;
  projectCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(todayISO);
  const paid = milestone.status === MilestoneStatus.PAID;
  const late = isOverdue(milestone.due_date, paid);
  const badge = late
    ? OVERDUE_LABEL
    : labelOf(MILESTONE_STATUSES, milestone.status);

  const [pending, run] = useRun(
    markMilestonePaid.bind(
      null,
      milestone.id,
      milestone.project_id,
      milestone.status
    ),
    () => setOpen(false)
  );

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          href={`/projects/${milestone.project_id}`}
          className="hover:underline"
        >
          {projectCode}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {MILESTONE_TYPES[milestone.type] ?? milestone.type}
      </TableCell>
      <TableCell className="text-right">
        {formatVND(milestone.amount)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {milestone.due_date ? formatDate(milestone.due_date) : "—"}
      </TableCell>
      <TableCell>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {milestone.paid_date ? formatDate(milestone.paid_date) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {!paid ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              Ghi nhận đã thu
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ghi nhận đã thu</DialogTitle>
                </DialogHeader>
                <div className="space-y-1">
                  <Label htmlFor={`paid-${milestone.id}`}>Ngày thu</Label>
                  <DateInput
                    id={`paid-${milestone.id}`}
                    value={paidDate}
                    onChange={setPaidDate}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Đóng
                  </Button>
                  <Button
                    disabled={pending || !paidDate}
                    onClick={() => run({ paid_date: paidDate })}
                  >
                    Xác nhận
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function BillRow({
  bill,
  projectCode,
}: {
  bill: Bill;
  projectCode: string;
}) {
  const idx = BILL_ORDER.indexOf(bill.status);
  const official = idx >= BILL_ORDER.indexOf(BillStatus.OFFICIAL);
  const badge = labelOf(BILL_STATUSES, bill.status);
  const [pending, run] = useRun(
    updateBill.bind(null, bill.id, bill.project_id)
  );

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/projects/${bill.project_id}`} className="hover:underline">
          {projectCode}
        </Link>
      </TableCell>
      <TableCell className="text-right">
        {formatVND(bill.total_amount)}
      </TableCell>
      <TableCell>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {bill.sent_date ? formatDate(bill.sent_date) : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {bill.paid_date ? formatDate(bill.paid_date) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {official && idx < BILL_ORDER.indexOf(BillStatus.SENT) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run({ status: BillStatus.SENT })}
            >
              Đã gửi
            </Button>
          ) : null}
          {official && idx < BILL_ORDER.indexOf(BillStatus.PAID) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run({ status: BillStatus.PAID })}
            >
              Đã thu
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

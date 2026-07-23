"use client";

import { useState } from "react";
import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { TableCell, TableRow } from "@yan/ui/components/table";

import { formatDate, formatVND, isOverdue } from "@/lib/format";
import {
  billStatus,
  milestoneStatus,
  milestoneType,
  overdue,
} from "@/lib/labels";

import { markMilestonePaid } from "./actions/milestones";
import { updateBill } from "./actions/update-bill";
import { BillStatus, MilestoneStatus } from "./enums";
import type { Bill, PaymentMilestone } from "./types";

const TODAY = () => new Date().toISOString().slice(0, 10);
const BILL_ORDER: BillStatus[] = [
  BillStatus.DRAFT,
  BillStatus.OFFICIAL,
  BillStatus.SENT,
  BillStatus.PAID,
];

function useRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (prev: ServerActionState, input: any) => Promise<ServerActionState>,
  onSuccess?: () => void
) {
  const [state, formAction] = useActionState(fn, {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess,
  });
  const run = (input?: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startTransition(() => formAction(input as any));
  return [isPending, run] as const;
}

export function MilestoneRow({
  milestone,
  projectCode,
}: {
  milestone: PaymentMilestone;
  projectCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(TODAY);
  const paid = milestone.status === MilestoneStatus.PAID;
  const late = isOverdue(milestone.due_date, paid);
  const badge = late ? overdue : milestoneStatus[milestone.status];

  const [pending, run] = useRun(
    markMilestonePaid.bind(
      null,
      milestone.id,
      milestone.project_id,
      milestone.status
    ) as never,
    () => setOpen(false)
  );

  return (
    <TableRow>
      <TableCell className="font-medium">{projectCode}</TableCell>
      <TableCell className="text-muted-foreground">
        {milestoneType[milestone.type]}
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
                  <Input
                    id={`paid-${milestone.id}`}
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
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
  const [pending, run] = useRun(
    updateBill.bind(null, bill.id, bill.project_id) as never
  );

  return (
    <TableRow>
      <TableCell className="font-medium">{projectCode}</TableCell>
      <TableCell className="text-right">
        {formatVND(bill.total_amount)}
      </TableCell>
      <TableCell>
        <Badge variant={billStatus[bill.status].variant}>
          {billStatus[bill.status].label}
        </Badge>
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

"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";
import { TableCell, TableRow } from "@yan/ui/components/table";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import {
  BILL_STATUSES,
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

import { markMilestonePaid, updateMilestone } from "../actions/milestones";
import { updateBill } from "../actions/update-bill";
import { BILL_ORDER } from "../constants";
import { BillStatus, MilestoneStatus } from "../enums";
import type { Bill, PaymentMilestone } from "../types";

/** Ngày thu picker — shared by the "đã thu" confirms and their date corrections. */
function PaidDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{FIELDS.collectDate}</Label>
      <DateInput id={id} value={value} onChange={onChange} />
    </div>
  );
}

export function MilestoneRow({
  milestone,
  projectCode,
}: {
  milestone: PaymentMilestone;
  projectCode: string;
}) {
  const [paidDate, setPaidDate] = useState(todayISO);
  const [fixDate, setFixDate] = useState(
    () => milestone.paid_date ?? todayISO()
  );
  const paid = milestone.status === MilestoneStatus.PAID;
  const late = isOverdue(milestone.due_date, paid);
  // Overdue is DERIVED and sits BESIDE the status, never instead of it: as the
  // only badge it hid whether an overdue đợt was chờ thanh toán or chưa đến hạn
  // — the same pair the paperwork table has always shown as two chips.
  const status = labelOf(MILESTONE_STATUSES, milestone.status);
  const type = MILESTONE_TYPES[milestone.type] ?? milestone.type;

  const [pending, run] = useRun(
    markMilestonePaid.bind(
      null,
      milestone.id,
      milestone.project_id,
      milestone.status
    )
  );
  // Status is one-step forward server-side, so a mis-click cannot be walked
  // back — but paid_date is patchable on its own, which covers the likely
  // mistake: right đợt, wrong day.
  const [fixPending, runFix] = useRun(
    updateMilestone.bind(null, milestone.id, milestone.project_id)
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
      <TableCell className="text-muted-foreground">{type}</TableCell>
      <TableCell className="text-right">
        {formatVND(milestone.amount)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {milestone.due_date ? formatDate(milestone.due_date) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={status.variant}>{status.label}</Badge>
          {late ? (
            <Badge variant={OVERDUE_LABEL.variant}>{OVERDUE_LABEL.label}</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {milestone.paid_date ? formatDate(milestone.paid_date) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {paid ? (
          <ConfirmAction
            trigger={
              <Button variant="outline" size="sm">
                Sửa ngày thu
              </Button>
            }
            title="Sửa ngày thu"
            consequence={`Đổi ngày thu của đợt ${type} · ${formatVND(milestone.amount)} (${projectCode}). Trạng thái "Đã thu" không thay đổi.`}
            pending={fixPending}
            confirmDisabled={!fixDate}
            onConfirm={() => runFix({ paid_date: fixDate })}
          >
            <PaidDateField
              id={`fix-paid-${milestone.id}`}
              value={fixDate}
              onChange={setFixDate}
            />
          </ConfirmAction>
        ) : (
          <ConfirmAction
            trigger={
              <Button variant="outline" size="sm">
                Ghi nhận đã thu
              </Button>
            }
            title="Ghi nhận đã thu"
            consequence={`Ghi nhận đã thu ${formatVND(milestone.amount)} cho đợt ${type} của ${projectCode}. Sau khi ghi nhận chỉ sửa được ngày thu, không bỏ được trạng thái.`}
            pending={pending}
            confirmDisabled={!paidDate}
            onConfirm={() => run({ paid_date: paidDate })}
          >
            <PaidDateField
              id={`paid-${milestone.id}`}
              value={paidDate}
              onChange={setPaidDate}
            />
          </ConfirmAction>
        )}
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
  // A paid bill's picker opens on the date already recorded — the correction
  // path edits that day, it doesn't re-pick today.
  const [paidDate, setPaidDate] = useState(() => bill.paid_date ?? todayISO());
  const [sentDate, setSentDate] = useState(() => bill.sent_date ?? todayISO());
  const [pending, run] = useRun(
    updateBill.bind(null, bill.id, bill.project_id)
  );

  const amount = formatVND(bill.total_amount);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/projects/${bill.project_id}`} className="hover:underline">
          {projectCode}
        </Link>
      </TableCell>
      <TableCell className="text-right">{amount}</TableCell>
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
            <ConfirmAction
              trigger={
                <Button variant="outline" size="sm">
                  Đã gửi
                </Button>
              }
              title="Đánh dấu hóa đơn đã gửi"
              consequence={`Hóa đơn ${amount} của ${projectCode} chuyển sang "Đã gửi". Trạng thái hóa đơn chỉ đi một chiều — không quay lại được.`}
              pending={pending}
              confirmDisabled={!sentDate}
              onConfirm={() =>
                run({ status: BillStatus.SENT, sent_date: sentDate })
              }
            >
              <div className="space-y-1">
                <Label htmlFor={`sent-${bill.id}`}>Ngày gửi</Label>
                <DateInput
                  id={`sent-${bill.id}`}
                  value={sentDate}
                  onChange={setSentDate}
                />
              </div>
            </ConfirmAction>
          ) : null}

          {official && idx < BILL_ORDER.indexOf(BillStatus.PAID) ? (
            <ConfirmAction
              trigger={
                <Button variant="outline" size="sm">
                  Đã thu
                </Button>
              }
              title="Ghi nhận hóa đơn đã thu"
              consequence={`Ghi nhận đã thu toàn bộ ${amount} của ${projectCode}. Trạng thái hóa đơn chỉ đi một chiều — sau đó chỉ sửa được ngày thu.`}
              pending={pending}
              confirmDisabled={!paidDate}
              onConfirm={() =>
                run({ status: BillStatus.PAID, paid_date: paidDate })
              }
            >
              <PaidDateField
                id={`bill-paid-${bill.id}`}
                value={paidDate}
                onChange={setPaidDate}
              />
            </ConfirmAction>
          ) : null}

          {bill.status === BillStatus.PAID ? (
            <ConfirmAction
              trigger={
                <Button variant="outline" size="sm">
                  Sửa ngày thu
                </Button>
              }
              title="Sửa ngày thu"
              consequence={`Đổi ngày thu của hóa đơn ${amount} (${projectCode}). Trạng thái "Đã thanh toán" không thay đổi.`}
              pending={pending}
              confirmDisabled={!paidDate}
              onConfirm={() => run({ paid_date: paidDate })}
            >
              <PaidDateField
                id={`bill-fix-${bill.id}`}
                value={paidDate}
                onChange={setPaidDate}
              />
            </ConfirmAction>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

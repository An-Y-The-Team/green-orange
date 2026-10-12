"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { markMilestonePaid } from "@/app/(dashboard)/receivables/actions/milestones";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { MILESTONE_TYPES } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { todayISO } from "@/utils/today-iso/today-iso";

/**
 * "Khách đã chuyển tiền…" for the next đợt: the stage's one primary button and
 * the money-safety confirm behind it. Recording the LAST đợt also pays the bill
 * and closes the project on the server, so that case says so in an amber box.
 */
export function RecordMilestonePaid({
  milestone,
  number,
  projectId,
  billId,
  isLast,
  remainingAfter,
}: {
  milestone: PaymentMilestone;
  /** "Đợt N". */
  number: number;
  projectId: number;
  billId?: number | null;
  isLast: boolean;
  remainingAfter: number;
}) {
  const [paidDate, setPaidDate] = useState(todayISO);
  const type = MILESTONE_TYPES[milestone.type] ?? milestone.type;
  const billText = billId ? `HĐ #${billId}` : "";
  // markMilestonePaid walks not_due → awaiting_payment → paid itself, so the
  // caller never has to know the step rule.
  const [pending, run] = useRun(
    markMilestonePaid.bind(null, milestone.id, projectId, milestone.status)
  );

  // Confirm: records the đợt as collected on the chosen date.
  const handleConfirm = () => run({ paid_date: paidDate });

  return (
    <ConfirmAction
      trigger={<Button className="w-full">Khách đã chuyển tiền…</Button>}
      title="Ghi nhận khách đã trả tiền"
      consequence="Chỉ bấm khi đã thấy tiền vào tài khoản. Sau khi lưu chỉ sửa được ngày, không bỏ được."
      confirmLabel={`Đã nhận ${formatVND(milestone.amount)}`}
      pending={pending}
      confirmDisabled={!paidDate}
      onConfirm={handleConfirm}
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {[`Đợt ${number}`, type, billText].filter(Boolean).join(" · ")}
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {formatVND(milestone.amount)}
          </p>
          <p className="text-sm text-muted-foreground">
            Sau đợt này còn lại {formatVND(remainingAfter)}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`paid-${milestone.id}`}>Ngày tiền về tài khoản</Label>
          <DateInput
            id={`paid-${milestone.id}`}
            value={paidDate}
            onChange={setPaidDate}
          />
        </div>
        {isLast ? (
          <p className="rounded-md bg-waiting-soft p-3 text-sm text-waiting">
            Đây là đợt cuối. Lưu xong: hóa đơn {billText || "này"} thành “Đã
            thanh toán” và công trình tự chuyển sang Đã đóng.
          </p>
        ) : null}
      </div>
    </ConfirmAction>
  );
}

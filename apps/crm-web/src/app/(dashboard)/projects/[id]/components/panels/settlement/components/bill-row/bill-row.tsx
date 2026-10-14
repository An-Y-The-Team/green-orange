"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { updateBill } from "@/app/(dashboard)/receivables/actions/update-bill";
import { BillStatus } from "@/app/(dashboard)/receivables/enums";
import type { Bill } from "@/app/(dashboard)/receivables/types";
import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { ATTACHMENT_KINDS, BILL_STATUSES } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";

/**
 * The settlement's hóa đơn, as a block under the đợt. It has no pay button on
 * purpose: the bill turns paid by itself when the last đợt is collected. The
 * CRM only prints the đề nghị thanh toán; the real hóa đơn VAT is issued
 * outside it, so its file is attached here (optional).
 */
export function BillRow({
  bill,
  projectId,
  attachments,
}: {
  bill: Bill;
  projectId: number;
  attachments: Attachment[];
}) {
  const [sentDate, setSentDate] = useState(todayISO);
  const [pending, run] = useRun(updateBill.bind(null, bill.id, projectId));
  const badge = labelOf(BILL_STATUSES, bill.status);

  // Confirm: stamps the bill as sent on the chosen date.
  const handleSent = () =>
    run({ status: BillStatus.SENT, sent_date: sentDate });

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Hóa đơn HĐ #{bill.id}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="ml-auto font-semibold tabular-nums">
          {formatVND(bill.total_amount)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/projects/${projectId}/print/bill/${bill.id}`}
              target="_blank"
            />
          }
        >
          <Printer className="size-4" />
          In đề nghị thanh toán
        </Button>
        {bill.status === BillStatus.OFFICIAL ? (
          <ConfirmAction
            trigger={
              <Button variant="outline" size="sm">
                Đã gửi đề nghị…
              </Button>
            }
            title="Đánh dấu đề nghị thanh toán đã gửi"
            consequence={`Hóa đơn HĐ #${bill.id} chuyển sang "Đã gửi". Trạng thái hóa đơn chỉ đi một chiều, không quay lại được.`}
            pending={pending}
            confirmDisabled={!sentDate}
            onConfirm={handleSent}
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
        <AttachmentList
          compact
          owner={{ project_id: projectId }}
          kind={AttachmentKind.VAT_INVOICE}
          link={{ bill_id: bill.id }}
          initial={attachments.filter(
            (a) =>
              a.kind === AttachmentKind.VAT_INVOICE && a.bill_id === bill.id
          )}
          title={`${ATTACHMENT_KINDS[AttachmentKind.VAT_INVOICE]} (tùy chọn)`}
          target={`HĐ #${bill.id}`}
          emptyMessage="Chưa có hóa đơn VAT. Thêm tệp hóa đơn điện tử khi đã xuất."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Hóa đơn tự thành “Đã thanh toán” khi thu đủ các đợt.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { signSettlement } from "@/app/(dashboard)/receivables/actions/settlement-status";
import type { Bill, Settlement } from "@/app/(dashboard)/receivables/types";
import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { settlementTotals } from "@/utils/quote-totals/quote-totals";
import { todayISO } from "@/utils/today-iso/today-iso";

/**
 * Bước 3: waiting for the client's signature. The date and the optional scan
 * live right here; one click signs, which officializes the bill.
 */
export function StepSign({
  settlement,
  bill,
  projectId,
  attachments,
}: {
  settlement: Settlement;
  bill?: Bill | null;
  projectId: number;
  attachments: Attachment[];
}) {
  const [signedDate, setSignedDate] = useState(todayISO);
  const [pending, run] = useRun(signSettlement.bind(null, settlement.id));
  const payable = formatVND(settlementTotals(settlement).total);

  // Primary: records the signature, which mints the real bill and đợt.
  const handleSign = () => run({ signed_date: signedDate });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">QT #{settlement.id}</span>
        <Badge variant="warning">Chờ khách ký</Badge>
        <span className="ml-auto font-semibold tabular-nums">{payable}</span>
      </div>
      <AttachmentList
        owner={{ project_id: projectId }}
        kind={AttachmentKind.SETTLEMENT}
        initial={attachments.filter(
          (a) => a.kind === AttachmentKind.SETTLEMENT
        )}
        title="Biên bản quyết toán đã ký (nên có, không bắt buộc)"
        emptyMessage="Chưa có bản quyết toán đã ký. Chụp hoặc quét bản có chữ ký rồi thêm vào đây."
      />
      <div className="space-y-1">
        <Label htmlFor={`signed-${settlement.id}`}>Ngày khách ký</Label>
        <DateInput
          id={`signed-${settlement.id}`}
          value={signedDate}
          onChange={setSignedDate}
          required
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Bấm xong: hóa đơn {bill ? `HĐ #${bill.id}` : ""} thành chính thức (
        {payable}), đợt cọc gắn vào hóa đơn, các đợt còn lại được tạo tự động.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={pending || !signedDate} onClick={handleSign}>
          Khách đã ký quyết toán
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              data-edit-link
              href={`/projects/${projectId}/settlements/${settlement.id}/edit`}
            />
          }
        >
          Sửa quyết toán
        </Button>
      </div>
    </div>
  );
}

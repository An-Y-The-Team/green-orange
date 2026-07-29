"use client";

import { Printer } from "lucide-react";
import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";

import { updateBill } from "@/app/(dashboard)/receivables/actions/update-bill";
import { BILL_ORDER } from "@/app/(dashboard)/receivables/constants";
import { BillStatus } from "@/app/(dashboard)/receivables/enums";
import type { Bill } from "@/app/(dashboard)/receivables/types";
import { billStatus } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";

/**
 * The settlement's hóa đơn. A draft bill has no advance buttons — it only turns
 * official when the settlement is signed, which is what mints the real total.
 */
export function BillRow({
  bill,
  projectId,
}: {
  bill: Bill;
  projectId: number;
}) {
  const idx = BILL_ORDER.indexOf(bill.status);
  const [pending, run] = useRun(updateBill.bind(null, bill.id, projectId));
  const official = idx >= BILL_ORDER.indexOf(BillStatus.OFFICIAL);
  const badge = labelOf(billStatus, bill.status);

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Hóa đơn HĐ #{bill.id}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {bill.status === BillStatus.DRAFT ? (
          <span className="text-muted-foreground">(chính thức khi ký)</span>
        ) : (
          <span className="ml-auto font-semibold tabular-nums">
            {formatVND(bill.total_amount)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
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
    </div>
  );
}

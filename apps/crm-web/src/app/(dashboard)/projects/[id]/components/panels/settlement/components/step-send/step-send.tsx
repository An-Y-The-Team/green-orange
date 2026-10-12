"use client";

import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";

import { deleteSettlement } from "@/app/(dashboard)/receivables/actions/delete-settlement";
import { sendSettlement } from "@/app/(dashboard)/receivables/actions/settlement-status";
import type { Settlement } from "@/app/(dashboard)/receivables/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { ACTIONS, SETTLEMENT_STATUSES } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";
import { settlementTotals } from "@/utils/quote-totals/quote-totals";

/** Bước 2: the draft is ready. Print or edit it, then mark it sent. */
export function StepSend({
  settlement,
  projectId,
}: {
  settlement: Settlement;
  projectId: number;
}) {
  const [sendPending, runSend] = useRun(
    sendSettlement.bind(null, settlement.id)
  );
  const [deletePending, runDelete] = useRun(
    deleteSettlement.bind(null, settlement.id)
  );
  const badge = labelOf(SETTLEMENT_STATUSES, settlement.status);

  // Primary: marks the quyết toán as sent to the client.
  const handleSend = () => runSend();
  // Confirm: deletes the draft and its draft bill.
  const handleDelete = () => runDelete();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">QT #{settlement.id}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="ml-auto font-semibold tabular-nums">
          {formatVND(settlementTotals(settlement).total)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        In ra hoặc gửi file cho khách xem. Còn sửa được cho tới khi khách ký.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/projects/${projectId}/print/settlement/${settlement.id}`}
              target="_blank"
            />
          }
        >
          In quyết toán
        </Button>
        <Button
          variant="outline"
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
        <ConfirmAction
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              Xóa nháp…
            </Button>
          }
          title="Xóa quyết toán nháp?"
          consequence={`QT #${settlement.id} và hóa đơn nháp của nó sẽ bị xóa.`}
          confirmLabel={ACTIONS.delete}
          confirmVariant="destructive"
          pending={deletePending}
          onConfirm={handleDelete}
        />
      </div>
      <Button disabled={sendPending} onClick={handleSend}>
        Đã gửi cho khách
      </Button>
    </div>
  );
}

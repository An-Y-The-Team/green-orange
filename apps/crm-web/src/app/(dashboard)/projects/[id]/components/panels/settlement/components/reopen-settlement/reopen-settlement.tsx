"use client";

import { Button } from "@yan/ui/components/button";

import { unsignSettlement } from "@/app/(dashboard)/receivables/actions/settlement-status";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { useRun } from "@/hooks/use-run/use-run";

/**
 * "Sửa lại (bỏ ký)": the correction path (one quyết toán per công trình).
 * `locked` mirrors the server's un-sign guard: once the bill is paid, or any
 * đợt other than the cọc is collected, un-signing is refused, so don't offer
 * it. Correcting a partly-collected quyết toán needs an adjustment đợt.
 */
export function ReopenSettlement({
  settlementId,
  locked,
}: {
  settlementId: number;
  locked: boolean;
}) {
  const [pending, run] = useRun(unsignSettlement.bind(null, settlementId));

  // Confirm: sends the quyết toán back to draft.
  const handleConfirm = () => run();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmAction
        trigger={
          <Button variant="outline" size="sm" disabled={locked}>
            Sửa lại (bỏ ký)
          </Button>
        }
        title="Mở lại quyết toán để sửa?"
        consequence={`Mỗi công trình chỉ có một quyết toán, nên sai số được sửa trên QT #${settlementId} này. Hóa đơn quay về nháp và các đợt thanh toán của hóa đơn bị xóa; đợt cọc được giữ lại và tự gắn lại khi ký lần nữa. Chỉ mở lại được khi chưa thu tiền ở đợt nào ngoài đợt cọc.`}
        confirmLabel="Mở lại để sửa"
        pending={pending}
        onConfirm={handleConfirm}
      />
      {locked ? (
        <span className="text-xs text-muted-foreground">
          Đã thu tiền ở đợt ngoài cọc nên không mở lại được. Điều chỉnh bằng một
          đợt thanh toán mới.
        </span>
      ) : null}
    </div>
  );
}

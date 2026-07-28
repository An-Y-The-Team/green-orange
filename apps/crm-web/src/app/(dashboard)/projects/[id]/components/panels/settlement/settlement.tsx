import Link from "next/link";

import { Button } from "@yan/ui/components/button";
import { Separator } from "@yan/ui/components/separator";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { formatVND } from "@/utils/format-vnd/format-vnd";

import type { Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";
import { SettlementCard } from "./components/settlement-card/settlement-card";

export function SettlementPanel({
  project,
  settlements,
  bills,
  milestones,
  dealQuote,
}: {
  project: Project;
  settlements: Settlement[];
  bills: Bill[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
}) {
  // One quyết toán per công trình (1:1) — the API still answers with a list.
  const settlement = settlements[0];
  const bill = settlement
    ? (settlement.bill ??
      bills.find((b) => b.settlement_id === settlement.id) ??
      null)
    : null;

  // Unallocated deposit(s) (pre-bill, stage 4) surface on the card — that's
  // where the sign transaction attaches them.
  const unallocated = milestones.filter((m) => m.bill_id == null);

  const collected = milestones
    .filter((m) => m.status === MilestoneStatus.PAID)
    .reduce((sum, m) => sum + m.amount, 0);
  const target = settlement?.total_amount ?? 0;

  return (
    <StageCard project={project} contentClassName="space-y-4">
      {settlement ? (
        <SettlementCard
          settlement={settlement}
          bill={bill}
          billMilestones={
            bill ? milestones.filter((m) => m.bill_id === bill.id) : []
          }
          extraMilestones={unallocated}
          projectId={project.id}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {dealQuote
            ? "Chưa có quyết toán. Quyết toán mới sẽ lấy hạng mục từ báo giá đã chốt."
            : "Chưa có quyết toán."}
        </p>
      )}

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="text-muted-foreground">Toàn công trình: </span>
          Đã thu{" "}
          <span className="font-semibold tabular-nums">
            {formatVND(collected)}
          </span>{" "}
          / <span className="tabular-nums">{formatVND(target)}</span>
        </p>
        {settlement ? null : (
          <Button
            size="sm"
            render={<Link href={`/projects/${project.id}/settlements/new`} />}
          >
            + Quyết toán
          </Button>
        )}
      </div>
    </StageCard>
  );
}

import Link from "next/link";

import { Button } from "@yan/ui/components/button";
import { Separator } from "@yan/ui/components/separator";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  MilestoneStatus,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { EmptyState } from "@/components/empty-state/empty-state";
import { MILESTONE_TYPES } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { settlementTotals } from "@/utils/quote-totals/quote-totals";

import { GateKey, ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
import { gateButtonProps } from "../../../utils/gate-button-props/gate-button-props";
import type { StageGate } from "../../../utils/stage-gates/stage-gates";
import {
  type GateActions,
  GateChecklist,
} from "../../gate-checklist/gate-checklist";
import { StageCard } from "../../stage-card/stage-card";
import { RecordMilestonePaid } from "./components/record-milestone-paid/record-milestone-paid";
import {
  SettlementAdvance,
  SettlementCard,
} from "./components/settlement-card/settlement-card";

export function SettlementPanel({
  project,
  settlements,
  bills,
  milestones,
  dealQuote,
  gates,
}: {
  project: Project;
  settlements: Settlement[];
  bills: Bill[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
  gates: StageGate[];
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
  // The payable, not the pre-tax Σ: the đợt thanh toán being counted against it
  // were derived from the payable on sign.
  const target = settlement ? settlementTotals(settlement).total : 0;

  // The đợt to collect next: earliest hạn first, undated ones after in
  // creation order. Only once signed — the đợt are derived on sign.
  const nextUnpaid =
    settlement?.status === SettlementStatus.SIGNED
      ? milestones
          .filter((m) => m.status !== MilestoneStatus.PAID)
          .sort(
            (a, b) =>
              (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
              a.id - b.id
          )[0]
      : undefined;

  // Create first, then send → sign, then collect. Hóa đơn chính thức follows
  // the signature, so it has no button of its own.
  const actions: GateActions = settlement
    ? {
        [GateKey.SETTLEMENT_SIGNED]: (primary) => (
          <SettlementAdvance settlement={settlement} primary={primary} />
        ),
        ...(nextUnpaid && {
          [GateKey.MILESTONES_PAID]: (primary: boolean) => (
            <RecordMilestonePaid
              milestone={nextUnpaid}
              projectId={project.id}
              primary={primary}
              label={`Ghi nhận đã thu · ${MILESTONE_TYPES[nextUnpaid.type] ?? nextUnpaid.type} · ${formatVND(nextUnpaid.amount)}`}
            />
          ),
        }),
      }
    : {
        [GateKey.SETTLEMENT_EXISTS]: (primary) => (
          <Button
            {...gateButtonProps(primary)}
            render={<Link href={`/projects/${project.id}/settlements/new`} />}
          >
            Lập quyết toán
          </Button>
        ),
      };

  return (
    <StageCard stage={ProjectStage.SETTLEMENT} contentClassName="space-y-4">
      <GateChecklist
        stage={ProjectStage.SETTLEMENT}
        gates={gates}
        actions={actions}
      />
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
        <EmptyState
          message={
            dealQuote
              ? "Chưa có quyết toán. Quyết toán mới sẽ lấy hạng mục từ báo giá đã chốt."
              : "Chưa có quyết toán."
          }
        />
      )}

      <Separator />

      <p className="text-sm">
        <span className="text-muted-foreground">Toàn công trình: </span>
        Đã thu{" "}
        <span className="font-semibold tabular-nums">
          {formatVND(collected)}
        </span>{" "}
        / <span className="tabular-nums">{formatVND(target)}</span>
      </p>
    </StageCard>
  );
}

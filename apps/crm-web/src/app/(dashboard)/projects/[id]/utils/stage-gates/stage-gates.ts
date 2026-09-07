import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";

import {
  AcceptanceSubStatus,
  PaperworkStatus,
  ProjectStage,
} from "../../../enums";
import type { Attachment, PaperworkItem, Project } from "../../../types";

/**
 * "What does this job still need?" — the one question the workspace exists to
 * answer, and the one it could not.
 *
 * The rules are the backend's auto-advance triggers, listed once in
 * `docs/features/crm-business-flow.md` ("Cross-entity rules") and implemented in
 * `crm-api-nest/src/common/stage.ts` + its callers. They are **not** hard gates:
 * a manual stage move always applies (`projects.module.ts`: "No stage gates …
 * transitions are soft"), so these rows are a soft warning, never a block. Read
 * `done: false` as "the work that normally advances this stage hasn't happened",
 * not "you may not proceed".
 *
 * Derived on every render from the data the panel already has — never stored,
 * because a stored copy is a second source of truth that goes stale the moment
 * someone edits a milestone.
 *
 * Deliberately no `action` here: this is a pure function, and an action is a
 * client dialog. The contract stage pairs each of its conditions with the button
 * that satisfies it, inside its own panel — see the note in `stage-panel.tsx`.
 */
export interface StageGate {
  /** Stable key, for tests and for a panel that wants to attach an action. */
  key: string;
  label: string;
  done: boolean;
  /** Short right-aligned fact — a date, an amount, "3/4 đã duyệt". */
  detail?: string;
}

export interface StageGateInput {
  project: Project;
  quotes?: Quote[];
  paperworkItems?: PaperworkItem[];
  attachments?: Attachment[];
  milestones?: PaymentMilestone[];
  bills?: Bill[];
  settlements?: Settlement[];
}

const gate = (
  key: string,
  label: string,
  done: boolean,
  detail?: string
): StageGate => ({ key, label, done, detail });

export function stageGates({
  project,
  quotes,
  paperworkItems,
  attachments = [],
  milestones = [],
  bills = [],
  settlements = [],
}: StageGateInput): StageGate[] {
  // `project.quotes` / `project.paperwork_items` come from GET /projects/:id;
  // an explicit list wins when the caller loaded a fresher one.
  const quoteRows = quotes ?? project.quotes ?? [];
  const paperwork = paperworkItems ?? project.paperwork_items ?? [];

  switch (project.stage) {
    case ProjectStage.REQUEST: {
      // Yêu cầu and Khảo sát are ONE stage — the appointment IS the survey
      // visit (stage.ts, 2026-07-25), so all three rows live here.
      const surveyed =
        (project.survey_items?.length ?? 0) > 0 ||
        Boolean(project.survey_note?.trim()) ||
        attachments.length > 0;
      return [
        gate("appointment", "Đã hẹn khảo sát", Boolean(project.appointment_at)),
        gate("visit", "Đã gặp khách / khảo sát", Boolean(project.visit_date)),
        gate(
          "survey_data",
          "Đã ghi dữ liệu khảo sát",
          surveyed,
          project.survey_items?.length
            ? `${project.survey_items.length} hạng mục`
            : undefined
        ),
      ];
    }

    case ProjectStage.QUOTE: {
      const deal = quoteRows.find((q) => q.status === QuoteStatus.DEAL);
      return [
        gate(
          "quote_exists",
          "Đã lập báo giá",
          quoteRows.length > 0,
          quoteRows.length ? `${quoteRows.length} phiên bản` : undefined
        ),
        gate(
          "quote_deal",
          "Khách đã chốt một báo giá",
          Boolean(deal),
          deal ? `v${deal.version}` : undefined
        ),
      ];
    }

    case ProjectStage.CONTRACT:
      // Rendered by ContractPanel with an action on each row, not here.
      return [
        gate(
          "quote_deal",
          "Báo giá đã chốt",
          quoteRows.some((q) => q.status === QuoteStatus.DEAL)
        ),
        gate(
          "client_signed",
          "Khách ký xác nhận",
          Boolean(project.client_signed_date)
        ),
        gate("deposit", "Nhận cọc (tạm ứng)", hasPaidDeposit(milestones)),
      ];

    case ProjectStage.PAPERWORK: {
      const approved = paperwork.filter(
        (p) => p.status === PaperworkStatus.APPROVED
      ).length;
      return [
        gate(
          "paperwork_approved",
          "Toàn bộ hồ sơ đã duyệt",
          paperwork.length > 0 && approved === paperwork.length,
          paperwork.length ? `${approved}/${paperwork.length} đã duyệt` : "—"
        ),
        gate("deposit", "Đã nhận cọc", hasPaidDeposit(milestones)),
      ];
    }

    case ProjectStage.EXECUTION:
      return [
        gate(
          "start_date",
          "Đã ghi ngày khởi công",
          Boolean(project.start_date)
        ),
        gate(
          "works_done",
          "Đã xác nhận hoàn tất thi công",
          Boolean(project.works_done_at)
        ),
      ];

    case ProjectStage.ACCEPTANCE:
      return [
        gate(
          "acceptance_passed",
          "Nghiệm thu đạt (đã ký BB)",
          project.acceptance_sub_status === AcceptanceSubStatus.PASSED,
          project.acceptance_passed_date ?? undefined
        ),
      ];

    case ProjectStage.SETTLEMENT: {
      const settlement = settlements[0];
      const unpaid = milestones.filter(
        (m) => m.status !== MilestoneStatus.PAID
      ).length;
      return [
        gate("settlement_exists", "Đã lập quyết toán", Boolean(settlement)),
        gate(
          "settlement_signed",
          "Khách đã ký quyết toán",
          settlement?.status === SettlementStatus.SIGNED
        ),
        gate(
          "bill_official",
          "Hóa đơn đã chính thức",
          bills.some((b) => b.status !== BillStatus.DRAFT)
        ),
        gate(
          "milestones_paid",
          "Đã thu đủ các đợt thanh toán",
          milestones.length > 0 && unpaid === 0,
          milestones.length
            ? `${milestones.length - unpaid}/${milestones.length} đã thu`
            : "—"
        ),
      ];
    }

    case ProjectStage.CLOSED:
      // Terminal: nothing left to need. An empty list is how the UI knows to
      // render nothing at all rather than an empty checklist card.
      return [];
  }
}

const hasPaidDeposit = (milestones: PaymentMilestone[]) =>
  milestones.some(
    (m) => m.type === MilestoneType.DEPOSIT && m.status === MilestoneStatus.PAID
  );

/** `2/3` for the stepper's current step; `null` when the stage has no gates. */
export function gateProgress(
  gates: StageGate[]
): { done: number; total: number } | null {
  if (gates.length === 0) return null;
  return { done: gates.filter((g) => g.done).length, total: gates.length };
}

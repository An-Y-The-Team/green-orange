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
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { formatDate } from "@/utils/format-date/format-date";

import {
  AcceptanceSubStatus,
  GateKey,
  PaperworkNeededFor,
  PaperworkStatus,
  ProjectStage,
} from "../../../enums";
import type { PaperworkItem, Project } from "../../../types";

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
 * Deliberately no action component here: this is a pure function, and an
 * action is client UI. Each panel maps a `GateKey` to the button that
 * satisfies it and hands both to `GateChecklist` — gate = task.
 */
export interface StageGate {
  /** Stable key: tests, and the panel's key → action map. */
  key: GateKey;
  label: string;
  done: boolean;
  /** Short right-aligned fact — a date, an amount, "3/4 đã duyệt". */
  detail?: string;
  /**
   * Finishing this row is one of the server's auto-advance triggers
   * (crm-api-nest common/stage.ts). The checklist only promises the move when
   * it is also the last open row, so the promise is never wrong.
   */
  advances?: boolean;
  /**
   * A later stage depends on this row (no agreed quote, no cọc, paid without
   * passing nghiệm thu), so the nav flags its stage "!" when it is still open
   * after the job moved on. Most rows are optional for a backfilled job and
   * must NOT carry it — the marker is only useful while it is rare.
   */
  leftover?: boolean;
}

export interface StageGateInput {
  project: Project;
  /**
   * The stage to answer for — defaults to the project's current stage. The
   * workspace nav asks for every stage so it can mark finished stages and flag
   * a past one with work left over (after a manual move).
   */
  stage?: ProjectStage;
  quotes?: Quote[];
  paperworkItems?: PaperworkItem[];
  attachments?: Attachment[];
  milestones?: PaymentMilestone[];
  bills?: Bill[];
  settlements?: Settlement[];
}

const gate = (
  key: GateKey,
  label: string,
  done: boolean,
  detail?: string,
  advances?: boolean
): StageGate => ({ key, label, done, detail, advances });

export function stageGates({
  project,
  stage = project.stage,
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

  switch (stage) {
    case ProjectStage.REQUEST: {
      // Yêu cầu and Khảo sát are ONE stage — the appointment IS the survey
      // visit (stage.ts, 2026-07-25). The last row is the exit: creating the
      // quote is what moves the job to Báo giá.
      const surveyed =
        (project.survey_items?.length ?? 0) > 0 ||
        Boolean(project.survey_note?.trim()) ||
        // Survey photos only — a contract scan or hoàn công photo is not a
        // survey, and used to tick this row on any job that had files.
        attachments.some((a) => a.kind === AttachmentKind.SURVEY);
      return [
        gate(
          GateKey.APPOINTMENT,
          "Hẹn khảo sát",
          Boolean(project.appointment_at)
        ),
        gate(
          GateKey.VISIT,
          "Đã gặp khách, bắt đầu khảo sát",
          Boolean(project.visit_date)
        ),
        gate(
          GateKey.SURVEY_DATA,
          "Ghi khảo sát: hạng mục, kích thước, ảnh",
          surveyed,
          project.survey_items?.length
            ? `${project.survey_items.length} hạng mục`
            : undefined
        ),
        gate(
          GateKey.QUOTE_FROM_SURVEY,
          "Lập báo giá từ khảo sát",
          quoteRows.length > 0,
          undefined,
          true
        ),
      ];
    }

    case ProjectStage.QUOTE: {
      const deal = quoteRows.find((q) => q.status === QuoteStatus.DEAL);
      // The LATEST version decides "sent": a revised v2 draft re-opens the
      // Gửi row even though v1 already went out (PR #84 review).
      const latest = quoteRows.reduce<Quote | undefined>(
        (top, q) => (!top || q.version > top.version ? q : top),
        undefined
      );
      const sent = Boolean(latest) && latest?.status !== QuoteStatus.DRAFT;
      return [
        gate(
          GateKey.QUOTE_EXISTS,
          "Lập báo giá",
          quoteRows.length > 0,
          quoteRows.length ? `${quoteRows.length} phiên bản` : undefined
        ),
        gate(GateKey.QUOTE_SENT, "Gửi báo giá cho khách", sent),
        {
          ...gate(
            GateKey.QUOTE_DEAL,
            "Khách chốt báo giá",
            Boolean(deal),
            deal ? `v${deal.version}` : undefined,
            true
          ),
          leftover: true,
        },
      ];
    }

    case ProjectStage.CONTRACT:
      return [
        gate(
          GateKey.QUOTE_DEAL,
          "Báo giá đã chốt",
          quoteRows.some((q) => q.status === QuoteStatus.DEAL)
        ),
        gate(
          GateKey.CLIENT_SIGNED,
          "Khách ký xác nhận",
          Boolean(project.client_signed_date),
          project.client_signed_date
            ? formatDate(project.client_signed_date)
            : undefined
        ),
        {
          ...gate(
            GateKey.DEPOSIT,
            "Nhận cọc (tạm ứng)",
            hasPaidDeposit(milestones),
            undefined,
            true
          ),
          leftover: true,
        },
      ];

    case ProjectStage.PAPERWORK: {
      // Same rule as the server's paperworkReady: only the items needed for
      // Thi công count; later-stage documents wait for their own stage. The
      // server also wants the cọc, so both rows advance.
      const needed = paperwork.filter(
        (p) => p.needed_for === PaperworkNeededFor.EXECUTION
      );
      const approved = needed.filter(
        (p) => p.status === PaperworkStatus.APPROVED
      ).length;
      return [
        gate(
          GateKey.PAPERWORK_APPROVED,
          "Hồ sơ cần cho thi công đã duyệt",
          needed.length > 0 && approved === needed.length,
          needed.length ? `${approved}/${needed.length} đã duyệt` : "—",
          true
        ),
        gate(
          GateKey.DEPOSIT,
          "Đã nhận cọc",
          hasPaidDeposit(milestones),
          undefined,
          true
        ),
      ];
    }

    case ProjectStage.EXECUTION:
      return [
        gate(
          GateKey.START_DATE,
          "Ghi ngày khởi công",
          Boolean(project.start_date),
          project.start_date ? formatDate(project.start_date) : undefined
        ),
        gate(
          GateKey.WORKS_DONE,
          "Xác nhận hoàn tất thi công",
          Boolean(project.works_done_at),
          undefined,
          true
        ),
      ];

    case ProjectStage.ACCEPTANCE:
      return [
        {
          ...gate(
            GateKey.ACCEPTANCE_PASSED,
            "Nghiệm thu đạt, khách ký biên bản",
            project.acceptance_sub_status === AcceptanceSubStatus.PASSED,
            project.acceptance_passed_date
              ? formatDate(project.acceptance_passed_date)
              : undefined,
            true
          ),
          leftover: true,
        },
      ];

    case ProjectStage.SETTLEMENT: {
      const settlement = settlements[0];
      const unpaid = milestones.filter(
        (m) => m.status !== MilestoneStatus.PAID
      ).length;
      return [
        gate(GateKey.SETTLEMENT_EXISTS, "Lập quyết toán", Boolean(settlement)),
        gate(
          GateKey.SETTLEMENT_SIGNED,
          "Khách ký quyết toán",
          settlement?.status === SettlementStatus.SIGNED
        ),
        gate(
          GateKey.BILL_OFFICIAL,
          "Hóa đơn đã chính thức",
          bills.some((b) => b.status !== BillStatus.DRAFT)
        ),
        gate(
          GateKey.MILESTONES_PAID,
          "Thu đủ các đợt thanh toán",
          milestones.length > 0 && unpaid === 0,
          milestones.length
            ? `${milestones.length - unpaid}/${milestones.length} đã thu`
            : "—",
          true
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

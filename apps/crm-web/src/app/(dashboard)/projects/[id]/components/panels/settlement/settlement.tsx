import Link from "next/link";
import type { ReactNode } from "react";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { attachmentName } from "@/components/attachments/attachment-upload/attachment-upload";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { StepState } from "@/components/step-list/enums";
import { type StepItem, StepList } from "@/components/step-list/step-list";
import { ATTACHMENT_KINDS } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";

import { ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
import { viewHref } from "../../../utils/view-href/view-href";
import { StageCard } from "../../stage-card/stage-card";
import { StageDrawer } from "../../stage-drawer/stage-drawer";
import { StepCollect } from "./components/step-collect/step-collect";
import { StepCreate } from "./components/step-create/step-create";
import { StepSend } from "./components/step-send/step-send";
import { StepSign } from "./components/step-sign/step-sign";
import { SettlementStepKey } from "./enums";
import { paymentPlan } from "./utils/payment-plan/payment-plan";
import { settlementHistory } from "./utils/settlement-history/settlement-history";
import { settlementSteps } from "./utils/settlement-steps/settlement-steps";

export function SettlementPanel({
  project,
  attachments,
  settlements,
  bills,
  milestones,
  dealQuote,
}: {
  project: Project;
  attachments: Attachment[];
  settlements: Settlement[];
  bills: Bill[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
}) {
  // One quyết toán per công trình (1:1); the API still answers with a list.
  const settlement = settlements[0];
  const bill = settlement
    ? (settlement.bill ??
      bills.find((b) => b.settlement_id === settlement.id) ??
      null)
    : null;

  const signedFile = attachments.find(
    (a) => a.kind === AttachmentKind.SETTLEMENT
  );
  const steps = settlementSteps({
    settlement,
    signedFileName: signedFile ? attachmentName(signedFile.s3_key) : undefined,
  });

  // Unallocated deposit(s) (pre-bill, stage 4) come first: signing attaches them.
  const rows = [
    ...milestones.filter((m) => m.bill_id == null),
    ...milestones.filter((m) => bill && m.bill_id === bill.id),
  ];
  const plan = paymentPlan({ milestones: rows, bill });

  const showBanner =
    project.stage === ProjectStage.SETTLEMENT &&
    Boolean(project.acceptance_passed_date) &&
    settlements.length === 0;

  const bodies: Record<SettlementStepKey, ReactNode> = {
    [SettlementStepKey.CREATE]: (
      <StepCreate projectId={project.id} dealQuote={dealQuote} />
    ),
    [SettlementStepKey.SEND]: settlement ? (
      <StepSend settlement={settlement} projectId={project.id} />
    ) : null,
    [SettlementStepKey.SIGN]: settlement ? (
      <StepSign
        settlement={settlement}
        bill={bill}
        projectId={project.id}
        attachments={attachments}
      />
    ) : null,
    [SettlementStepKey.COLLECT]: settlement ? (
      <StepCollect
        settlementId={settlement.id}
        bill={bill}
        milestones={rows}
        plan={plan}
        projectId={project.id}
        attachments={attachments}
      />
    ) : null,
  };

  const items: StepItem[] = steps.map((step) => ({
    key: step.key,
    title: step.title,
    state: step.state,
    // Only DONE steps and the FUTURE Thu tiền hint carry a summary.
    summary:
      step.state === StepState.DONE ||
      (step.key === SettlementStepKey.COLLECT &&
        step.state === StepState.FUTURE)
        ? step.summary
        : undefined,
    badge:
      step.key === SettlementStepKey.COLLECT && step.state === StepState.NOW ? (
        <span className="ml-auto text-sm">
          Đã thu{" "}
          <span className="font-semibold tabular-nums">
            {formatVND(plan.collected)}
          </span>{" "}
          / <span className="tabular-nums">{formatVND(plan.target)}</span>
        </span>
      ) : undefined,
    children: bodies[step.key],
  }));

  const history = settlementHistory({
    settlement,
    bill,
    milestones: rows,
    numbers: plan.numbers,
  });
  const printHref = (path: string) => `/projects/${project.id}/print/${path}`;
  const proofLabels = Object.fromEntries(
    rows.map((m) => [m.id, `Đợt ${plan.numbers.get(m.id)}`])
  );

  return (
    <StageCard stage={ProjectStage.SETTLEMENT} contentClassName="space-y-4">
      {showBanner ? (
        <p
          role="status"
          className="rounded-lg bg-done-soft p-3 text-sm text-done"
        >
          ✓ Nghiệm thu xong ngày {formatDate(project.acceptance_passed_date)}.
          Công trình đã chuyển sang Quyết toán &amp; Thanh toán.{" "}
          <Link
            className="font-medium underline"
            href={viewHref({ project, view: ProjectStage.ACCEPTANCE })}
          >
            Xem lại Nghiệm thu
          </Link>
        </p>
      ) : null}

      <StepList steps={items} aria-label="Các bước quyết toán" />

      {settlement ? (
        <StageDrawer
          label="In · Giấy tờ · Lịch sử"
          sections={[
            {
              title: "In lại",
              content: (
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    className="underline"
                    href={printHref(`settlement/${settlement.id}`)}
                    target="_blank"
                  >
                    In quyết toán
                  </Link>
                  {bill ? (
                    <Link
                      className="underline"
                      href={printHref(`bill/${bill.id}`)}
                      target="_blank"
                    >
                      In đề nghị thanh toán
                    </Link>
                  ) : null}
                </div>
              ),
            },
            {
              title: "Giấy tờ",
              content: (
                <div className="space-y-3">
                  {[
                    AttachmentKind.SETTLEMENT,
                    AttachmentKind.VAT_INVOICE,
                    AttachmentKind.PAYMENT_PROOF,
                  ].map((kind) => (
                    <AttachmentList
                      key={kind}
                      // The signed scan often arrives after "Khách đã ký", when
                      // Bước 3 is closed: this is its only upload slot then.
                      // VAT and payment proof are added on their own rows.
                      addable={kind === AttachmentKind.SETTLEMENT}
                      owner={{ project_id: project.id }}
                      kind={kind}
                      initial={attachments.filter((a) => a.kind === kind)}
                      title={ATTACHMENT_KINDS[kind]}
                      emptyMessage="Chưa có tệp."
                      recordLabels={
                        kind === AttachmentKind.PAYMENT_PROOF
                          ? Object.fromEntries(
                              attachments
                                .filter(
                                  (a) =>
                                    a.kind === kind && a.payment_milestone_id
                                )
                                .map((a) => [
                                  a.id,
                                  proofLabels[a.payment_milestone_id ?? 0] ??
                                    "",
                                ])
                            )
                          : undefined
                      }
                    />
                  ))}
                </div>
              ),
            },
            {
              title: "Lịch sử",
              content: (
                <ul className="space-y-1 text-sm">
                  {history.length > 0 ? (
                    history.map((h) => (
                      <li key={h.key}>
                        <span className="tabular-nums text-muted-foreground">
                          {formatDate(h.date)}
                        </span>{" "}
                        {h.label}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">Chưa có mục nào.</li>
                  )}
                </ul>
              ),
            },
          ]}
        />
      ) : null}
    </StageCard>
  );
}

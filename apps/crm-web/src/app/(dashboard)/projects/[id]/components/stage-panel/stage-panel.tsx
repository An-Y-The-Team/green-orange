import { Lock } from "lucide-react";

import type { Contract } from "@/app/(dashboard)/contracts/types";
import type {
  Assignment,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import type { Attachment } from "@/components/attachments/types";
import { PROJECT_STAGE_ORDER } from "@/constants/labels";

import { ProjectStage } from "../../../enums";
import type { PaperworkItem, Project } from "../../../types";
import type { StageGate } from "../../utils/stage-gates/stage-gates";
import { FutureStagePreview } from "../future-stage-preview/future-stage-preview";
import { AcceptancePanel } from "../panels/acceptance/acceptance";
import { ClosedPanel } from "../panels/closed/closed";
import { ContractPanel } from "../panels/contract/contract";
import { ExecutionPanel } from "../panels/execution/execution";
import { PaperworkPanel } from "../panels/paperwork/paperwork";
import { QuotePanel } from "../panels/quote/quote";
import { RequestPanel } from "../panels/request/request";
import { SettlementPanel } from "../panels/settlement/settlement";
import { StageCard } from "../stage-card/stage-card";

// Dispatch to the VIEWED stage's panel (the workspace nav can open any stage).
// A past stage renders its own panel — corrections and leftover rows still
// work. A future stage renders a read-only preview, except Hồ sơ while the job
// is at Hợp đồng: paperwork is prepared in parallel (crm-business-flow.md §3). Every panel brings its own Card +
// "Giai đoạn N" header except ContractPanel (a bare body), which is wrapped here.
// Each panel renders the stage's gates itself, as the GateChecklist at the top
// of its body, with the button that completes each row (gate = task).
// (SurveyPanel is also bare — RequestPanel embeds it; stage 1 covers both.)
export function StagePanel({
  stage,
  project,
  attachments,
  contracts,
  milestones,
  bills,
  settlements,
  dealQuote,
  timekeeping,
  assignments,
  paperworkItems,
  gates,
}: {
  /** The stage being viewed — the project's current one unless the nav says otherwise. */
  stage: ProjectStage;
  project: Project;
  attachments: Attachment[];
  contracts: Contract[];
  milestones: PaymentMilestone[];
  bills: Bill[];
  settlements: Settlement[];
  dealQuote?: Quote;
  timekeeping: TimekeepingRecord[];
  assignments: Assignment[];
  paperworkItems: PaperworkItem[];
  gates: StageGate[];
}) {
  const ahead =
    PROJECT_STAGE_ORDER.indexOf(stage) >
    PROJECT_STAGE_ORDER.indexOf(project.stage);
  const parallelPaperwork =
    stage === ProjectStage.PAPERWORK && project.stage === ProjectStage.CONTRACT;
  if (ahead && !parallelPaperwork)
    return <FutureStagePreview stage={stage} gates={gates} />;

  // A closed job is locked server-side (409 on every edit). Its past stages
  // stay readable. `fieldset disabled` disables the real <button>s natively,
  // but NOT links — a `Button render={<Link/>}` is an <a> — so every link into
  // an editor or builder carries `data-edit-link` and is hidden here. View and
  // print links stay. The way back is "Mở lại" on the Đã đóng stage.
  if (project.stage === ProjectStage.CLOSED && stage !== ProjectStage.CLOSED)
    return (
      <>
        <p className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Lock aria-hidden className="size-4 shrink-0" />
          Công trình đã đóng — chỉ xem. Muốn sửa, mở lại công trình ở giai đoạn
          Đã đóng.
        </p>
        <fieldset disabled className="min-w-0 [&_[data-edit-link]]:hidden">
          {renderPanel()}
        </fieldset>
      </>
    );

  return renderPanel();

  function renderPanel() {
    switch (stage) {
      case ProjectStage.REQUEST:
        return (
          <RequestPanel
            project={project}
            attachments={attachments}
            gates={gates}
          />
        );
      case ProjectStage.QUOTE:
        return (
          <QuotePanel
            project={project}
            attachments={attachments}
            gates={gates}
          />
        );
      case ProjectStage.CONTRACT:
        return (
          <StageCard stage={ProjectStage.CONTRACT}>
            <ContractPanel
              project={project}
              attachments={attachments}
              contracts={contracts}
              milestones={milestones}
              dealQuote={dealQuote}
              gates={gates}
            />
          </StageCard>
        );
      case ProjectStage.PAPERWORK:
        return (
          <PaperworkPanel
            project={project}
            attachments={attachments}
            paperworkItems={paperworkItems}
            milestones={milestones}
            dealQuote={dealQuote}
            gates={gates}
          />
        );
      case ProjectStage.EXECUTION:
        return (
          <ExecutionPanel
            project={project}
            timekeeping={timekeeping}
            assignments={assignments}
            attachments={attachments}
            gates={gates}
          />
        );
      case ProjectStage.ACCEPTANCE:
        return (
          <AcceptancePanel
            project={project}
            attachments={attachments}
            gates={gates}
          />
        );
      case ProjectStage.SETTLEMENT:
        return (
          <SettlementPanel
            project={project}
            attachments={attachments}
            settlements={settlements}
            bills={bills}
            milestones={milestones}
            dealQuote={dealQuote}
            gates={gates}
          />
        );
      case ProjectStage.CLOSED:
        return (
          <ClosedPanel
            project={project}
            bills={bills}
            milestones={milestones}
            settlements={settlements}
            contracts={contracts}
          />
        );
      // A stage the enum doesn't know (a legacy row, or one the backend added)
      // used to fall out of the switch as `undefined`, which React throws on —
      // the same crash the label maps had. StageCard prints the raw value.
      default:
        return (
          <StageCard stage={stage}>
            <p className="text-sm text-muted-foreground">
              Giai đoạn này chưa được hỗ trợ trong ứng dụng.
            </p>
          </StageCard>
        );
    }
  }
}

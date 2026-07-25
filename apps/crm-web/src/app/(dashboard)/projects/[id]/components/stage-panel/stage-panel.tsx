import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

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
import { projectStage, projectStageOrder } from "@/constants/labels";

import { ProjectStage } from "../../../enums";
import type { Attachment, PaperworkItem, Project } from "../../../types";
import { AcceptancePanel } from "../panels/acceptance/acceptance";
import { ClosedPanel } from "../panels/closed/closed";
import { ContractPanel } from "../panels/contract/contract";
import { ExecutionPanel } from "../panels/execution/execution";
import { PaperworkPanel } from "../panels/paperwork/paperwork";
import { QuotePanel } from "../panels/quote/quote";
import { RequestPanel } from "../panels/request/request";
import { SettlementPanel } from "../panels/settlement/settlement";

// Dispatch to the current stage's panel. Every panel brings its own Card +
// "Giai đoạn N" header except ContractPanel (a bare body), which is wrapped here.
// (SurveyPanel is also bare — RequestPanel embeds it; stage 1 covers both.)
export function StagePanel({
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
}: {
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
}) {
  switch (project.stage) {
    case ProjectStage.REQUEST:
      return <RequestPanel project={project} attachments={attachments} />;
    case ProjectStage.QUOTE:
      return <QuotePanel project={project} />;
    case ProjectStage.CONTRACT:
      return (
        <Card id="stage-contract" className="mb-6 scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Giai đoạn {projectStageOrder.indexOf(project.stage) + 1} ·{" "}
              {projectStage[project.stage].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContractPanel
              project={project}
              contracts={contracts}
              milestones={milestones}
              dealQuote={dealQuote}
            />
          </CardContent>
        </Card>
      );
    case ProjectStage.PAPERWORK:
      return (
        <PaperworkPanel project={project} paperworkItems={paperworkItems} />
      );
    case ProjectStage.EXECUTION:
      return (
        <ExecutionPanel
          project={project}
          timekeeping={timekeeping}
          assignments={assignments}
        />
      );
    case ProjectStage.ACCEPTANCE:
      return <AcceptancePanel project={project} />;
    case ProjectStage.SETTLEMENT:
      return (
        <SettlementPanel
          project={project}
          settlements={settlements}
          bills={bills}
          milestones={milestones}
          dealQuote={dealQuote}
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
  }
}

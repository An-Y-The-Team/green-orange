import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import type { Contract } from "@/app/(dashboard)/contracts/types";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { formatDate } from "@/lib/format";
import {
  acceptanceSubStatus,
  executionSubStatus,
  projectStage,
  projectStageOrder,
} from "@/lib/labels";

import { ProjectStage } from "../../enums";
import type { Attachment, PaperworkItem, Project } from "../../types";
import { ContractPanel } from "./panels/contract";
import { PaperworkPanel } from "./panels/paperwork";
import { QuotePanel } from "./panels/quote";
import { RequestPanel } from "./panels/request";
import { SurveyPanel } from "./panels/survey";

// Read-only <dt>/<dd> grid, mirroring the phase-1 facts card. Empty rows drop out.
function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const present = rows.filter(([, v]) => v);
  if (present.length === 0) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {present.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const LATER = "Bảng điều khiển đầy đủ sẽ có ở giai đoạn kế tiếp.";

// Stub panel for stages 6–9 (execution, acceptance, settlement, closed) —
// real panels land in phase 4. ponytail: read-only facts until then.
function StubPanel({ project }: { project: Project }) {
  const n = projectStageOrder.indexOf(project.stage) + 1;
  let body;
  switch (project.stage) {
    case ProjectStage.EXECUTION:
      body = (
        <Facts
          rows={[
            [
              "Trạng thái thi công",
              project.execution_sub_status
                ? executionSubStatus[project.execution_sub_status].label
                : null,
            ],
            [
              "Khởi công",
              project.start_date ? formatDate(project.start_date) : null,
            ],
            [
              "Thời gian dự kiến",
              project.est_duration_days != null
                ? `${project.est_duration_days} ngày`
                : null,
            ],
            [
              "Thời gian thực tế",
              project.actual_duration_days != null
                ? `${project.actual_duration_days} ngày`
                : null,
            ],
            ["Phương án thi công", project.approaches],
          ]}
        />
      );
      break;
    case ProjectStage.ACCEPTANCE:
      body = (
        <Facts
          rows={[
            [
              "Trạng thái nghiệm thu",
              project.acceptance_sub_status
                ? acceptanceSubStatus[project.acceptance_sub_status].label
                : null,
            ],
            [
              "Xong hạng mục",
              project.works_done_at ? formatDate(project.works_done_at) : null,
            ],
            [
              "Nghiệm thu đạt",
              project.acceptance_passed_date
                ? formatDate(project.acceptance_passed_date)
                : null,
            ],
          ]}
        />
      );
      break;
    default:
      body = <p className="text-sm text-muted-foreground">{LATER}</p>;
  }
  return (
    <Card id={`stage-${project.stage}`} className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn {n} · {projectStage[project.stage].label}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

// Dispatch to the current stage's panel. Stages 1–5 have real panels (each
// brings its own Card + "Giai đoạn N" header); contract returns a bare body,
// so it's wrapped here; stages 6–9 fall to the read-only stub.
export function StagePanel({
  project,
  attachments,
  contracts,
  milestones,
  dealQuote,
  paperworkItems,
}: {
  project: Project;
  attachments: Attachment[];
  contracts: Contract[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
  paperworkItems: PaperworkItem[];
}) {
  switch (project.stage) {
    case ProjectStage.REQUEST:
      return <RequestPanel project={project} />;
    case ProjectStage.SURVEY:
      return <SurveyPanel project={project} attachments={attachments} />;
    case ProjectStage.QUOTE:
      return <QuotePanel project={project} />;
    case ProjectStage.CONTRACT:
      return (
        <Card id="stage-contract" className="mb-6 scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Giai đoạn 4 · {projectStage[project.stage].label}
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
    default:
      return <StubPanel project={project} />;
  }
}

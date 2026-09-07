import { notFound } from "next/navigation";

import { getProjectContracts } from "@/app/(dashboard)/contracts/queries";
import type { Contract } from "@/app/(dashboard)/contracts/types";
import {
  getProjectAssignments,
  getProjectTimekeeping,
  listCrew,
  listCrewRoles,
} from "@/app/(dashboard)/crew/queries";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";
import { getDealQuote } from "@/app/(dashboard)/quotes/queries";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  getProjectBills,
  getProjectMilestones,
  getProjectSettlements,
} from "@/app/(dashboard)/receivables/queries";
import type { Settlement } from "@/app/(dashboard)/receivables/types";
import { BackLink } from "@/components/back-link/back-link";
import { BACK_TO } from "@/constants/labels";
import { localDateOf, todayISO } from "@/utils/today-iso/today-iso";

import { loadClient } from "../../clients/actions/load-client";
import { ProjectStage } from "../enums";
import {
  getProject,
  listPaperworkItems,
  listProjectAttachments,
  listProjectTypes,
} from "../queries";
import type { Attachment } from "../types";
import { StagePanel } from "./components/stage-panel/stage-panel";
import { StageStepper } from "./components/stage-stepper/stage-stepper";
import { WorkspaceHeader } from "./components/workspace-header/workspace-header";
import { WorkspaceTabs } from "./components/workspace-tabs/workspace-tabs";
import { stageGates } from "./utils/stage-gates/stage-gates";

// Guided "Công Trình workspace" — header (Zone 1), stage rail (Zone 2),
// stage panel + tabs (Zone 3). Only the current stage's panel renders, so
// its supporting data is fetched only for the stage that needs it.
export default async function ProjectDetailPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(Number(id));

  if (!project) {
    notFound();
  }

  const paperworkItems =
    project.paperwork_items ?? (await listPaperworkItems(project.id));

  const { stage } = project;
  // Stage 1 owns the survey half now, so its attachments load there.
  const isRequest = stage === ProjectStage.REQUEST;
  const isContract = stage === ProjectStage.CONTRACT;
  const isExecution = stage === ProjectStage.EXECUTION;
  const isSettlement = stage === ProjectStage.SETTLEMENT;
  const isClosed = stage === ProjectStage.CLOSED;

  const needsContracts = isContract || isClosed;
  // Milestones and bills are NOT stage-gated any more: the Thanh toán tab is
  // available at every stage, and gating them meant a project at Thi công —
  // which cannot have got there without a collected cọc — showed "no payments".
  // Two extra reads on a page that already fans out a dozen, in exchange for a
  // tab that does not lie.
  const needsDealQuote = isContract || isSettlement;
  const needsMoneyDocs = isSettlement || isClosed;

  const [
    attachments,
    contracts,
    milestones,
    dealQuote,
    timekeeping,
    assignments,
    settlements,
    bills,
    crew,
    roles,
    projectTypes,
    clientDetail,
  ] = await Promise.all([
    isRequest
      ? listProjectAttachments(project.id, "survey")
      : Promise.resolve<Attachment[]>([]),
    needsContracts
      ? getProjectContracts(project.id)
      : Promise.resolve<Contract[]>([]),
    getProjectMilestones(project.id),
    needsDealQuote
      ? getDealQuote(project.id)
      : Promise.resolve<Quote | undefined>(undefined),
    isExecution
      ? // The execution panel totals a project's hours, so it asks for the
        // project's own lifetime — GET /timekeeping would otherwise answer with
        // its default last-31-days window and undercount.
        getProjectTimekeeping({
          projectId: project.id,
          range: {
            from: project.start_date ?? localDateOf(project.created_at),
            to: todayISO(),
          },
        })
      : Promise.resolve<TimekeepingRecord[]>([]),
    getProjectAssignments(project.id),
    needsMoneyDocs
      ? getProjectSettlements(project.id)
      : Promise.resolve<Settlement[]>([]),
    getProjectBills(project.id),
    listCrew(),
    listCrewRoles(),
    listProjectTypes(),
    loadClient(project.client_id),
  ]);

  // One derivation for the whole workspace: the rail shows the count, the panel
  // shows the rows. Computing it in both would be two chances to disagree.
  const gates = stageGates({
    project,
    paperworkItems,
    attachments,
    milestones,
    bills,
    settlements,
  });

  return (
    <>
      <BackLink href="/projects">{BACK_TO.list}</BackLink>

      <WorkspaceHeader
        project={project}
        contacts={clientDetail?.contacts ?? []}
        projectTypes={projectTypes}
      />
      <StageStepper project={project} gates={gates} />
      <StagePanel
        gates={gates}
        project={project}
        attachments={attachments}
        contracts={contracts}
        milestones={milestones}
        bills={bills}
        settlements={settlements}
        dealQuote={dealQuote}
        timekeeping={timekeeping}
        assignments={assignments}
        paperworkItems={paperworkItems}
      />
      <WorkspaceTabs
        project={project}
        paperworkItems={paperworkItems}
        assignments={assignments}
        crew={crew}
        roles={roles}
        milestones={milestones}
        bills={bills}
      />
    </>
  );
}

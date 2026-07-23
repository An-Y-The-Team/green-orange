import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";

import { ProjectStage } from "../enums";
import {
  getProject,
  listPaperworkItems,
  listProjectAttachments,
} from "../queries";
import type { Attachment } from "../types";
import { StagePanel } from "./components/stage-panel";
import { StageStepper } from "./components/stage-stepper";
import { WorkspaceHeader } from "./components/workspace-header";
import { WorkspaceTabs } from "./components/workspace-tabs";

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
  const isSurvey = stage === ProjectStage.SURVEY;
  const isContract = stage === ProjectStage.CONTRACT;
  const isExecution = stage === ProjectStage.EXECUTION;
  const isSettlement = stage === ProjectStage.SETTLEMENT;
  const isClosed = stage === ProjectStage.CLOSED;

  const needsContracts = isContract || isClosed;
  const needsMilestones = isContract || isSettlement || isClosed;
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
  ] = await Promise.all([
    isSurvey
      ? listProjectAttachments(project.id, "survey")
      : Promise.resolve<Attachment[]>([]),
    needsContracts
      ? getProjectContracts(project.id)
      : Promise.resolve<Contract[]>([]),
    needsMilestones
      ? getProjectMilestones(project.id)
      : Promise.resolve<PaymentMilestone[]>([]),
    needsDealQuote
      ? getDealQuote(project.id)
      : Promise.resolve<Quote | undefined>(undefined),
    isExecution
      ? getProjectTimekeeping(project.id)
      : Promise.resolve<TimekeepingRecord[]>([]),
    getProjectAssignments(project.id),
    needsMoneyDocs
      ? getProjectSettlements(project.id)
      : Promise.resolve<Settlement[]>([]),
    needsMoneyDocs ? getProjectBills(project.id) : Promise.resolve<Bill[]>([]),
    listCrew(),
    listCrewRoles(),
  ]);

  return (
    <>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <WorkspaceHeader project={project} />
      <StageStepper project={project} />
      <StagePanel
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
      />
    </>
  );
}

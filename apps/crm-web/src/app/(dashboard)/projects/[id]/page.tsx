import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { getProjectContracts } from "@/app/(dashboard)/contracts/queries";
import {
  getProjectAssignments,
  getProjectTimekeeping,
  listCrew,
  listCrewRoles,
} from "@/app/(dashboard)/crew/queries";
import type {
  CrewMember,
  CrewRole,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";
import { getDealQuote } from "@/app/(dashboard)/quotes/queries";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  getProjectBills,
  getProjectMilestones,
  getProjectSettlements,
} from "@/app/(dashboard)/receivables/queries";
import { BackLink } from "@/components/back-link/back-link";
import {
  BACK_TO,
  PROJECT_STAGE_ORDER,
  WORKSPACE_PANES,
} from "@/constants/labels";
import { localDateOf, todayISO } from "@/utils/today-iso/today-iso";

import { loadClient } from "../../clients/actions/load-client";
import { ProjectStage, WorkspacePane } from "../enums";
import {
  getProject,
  listPaperworkItems,
  listProjectAttachments,
  listProjectTypes,
} from "../queries";
import { AssignmentsTab } from "./components/assignments-tab/assignments-tab";
import { ContextPane } from "./components/context-pane/context-pane";
import { DocumentsView } from "./components/documents-view/documents-view";
import { StageNav } from "./components/stage-nav/stage-nav";
import { StagePanel } from "./components/stage-panel/stage-panel";
import { WorkspaceHeader } from "./components/workspace-header/workspace-header";
import { isStageView, parseView } from "./utils/parse-view/parse-view";
import { type StageGate, stageGates } from "./utils/stage-gates/stage-gates";

// The Công Trình record (option C, docs/features/crm-ui-redesign.md): header,
// then three panes — stage nav | the viewed stage's work | context (people,
// money, upcoming, notes). `?view=` picks the middle pane and defaults to the
// current stage; only that view's supporting data is fetched.
export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  // Next 16 route params and search params are async.
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ id }, { view: rawView }] = await Promise.all([params, searchParams]);
  const project = await getProject(Number(id));

  if (!project) {
    notFound();
  }

  const view = parseView({ raw: rawView, currentStage: project.stage });
  const viewStage = isStageView(view) ? view : null;

  const paperworkItems =
    project.paperwork_items ?? (await listPaperworkItems(project.id));

  // The checklists that ask for the cọc prefill 60% of the chốt quote.
  const needsDealQuote =
    viewStage === ProjectStage.CONTRACT ||
    viewStage === ProjectStage.PAPERWORK ||
    viewStage === ProjectStage.SETTLEMENT;
  const needsCrewLists = view === WorkspacePane.CREW;

  // Milestones, bills, settlements, survey attachments and assignments are read
  // on every view: the nav marks every stage from them and the context pane
  // shows the money. A handful of small reads in exchange for a nav that can
  // say "done" about a stage you aren't looking at.
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
    listProjectAttachments(project.id, "survey"),
    // Always: the nav's Giấy tờ count includes them, and a count that changes
    // with the view you're on reads as data appearing and vanishing.
    getProjectContracts(project.id),
    getProjectMilestones(project.id),
    needsDealQuote
      ? getDealQuote(project.id)
      : Promise.resolve<Quote | undefined>(undefined),
    viewStage === ProjectStage.EXECUTION
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
    getProjectSettlements(project.id),
    getProjectBills(project.id),
    needsCrewLists ? listCrew() : Promise.resolve<CrewMember[]>([]),
    needsCrewLists ? listCrewRoles() : Promise.resolve<CrewRole[]>([]),
    listProjectTypes(),
    loadClient(project.client_id),
  ]);

  // One derivation for the whole workspace: the nav marks every stage, the
  // panel renders the viewed stage's rows, the header's manual move lists the
  // current stage's open ones. Computing it twice would be two chances to
  // disagree.
  const gateInput = {
    project,
    paperworkItems,
    attachments,
    milestones,
    bills,
    settlements,
  };
  const gatesByStage = Object.fromEntries(
    PROJECT_STAGE_ORDER.map((s) => [s, stageGates({ ...gateInput, stage: s })])
  ) as Record<ProjectStage, StageGate[]>;

  const documentCount =
    (project.quotes?.length ?? 0) + contracts.length + settlements.length;

  return (
    <>
      <BackLink href="/projects">{BACK_TO.list}</BackLink>

      <WorkspaceHeader
        project={project}
        contacts={clientDetail?.contacts ?? []}
        projectTypes={projectTypes}
        gates={gatesByStage[project.stage]}
      />

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
        <StageNav
          project={project}
          view={view}
          gatesByStage={gatesByStage}
          documentCount={documentCount}
          crewCount={assignments.length}
        />

        <div className="min-w-0">
          {viewStage ? (
            <StagePanel
              stage={viewStage}
              gates={gatesByStage[viewStage]}
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
          ) : view === WorkspacePane.DOCUMENTS ? (
            <DocumentsView
              project={project}
              contracts={contracts}
              settlements={settlements}
              bills={bills}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle as="h2">
                  {WORKSPACE_PANES[WorkspacePane.CREW]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Same lock as a closed job's past stages (StagePanel): the
                    server 409s every assignment edit, so the roster is shown
                    but its buttons are disabled natively. */}
                {project.stage === ProjectStage.CLOSED ? (
                  <p className="text-sm text-muted-foreground">
                    Công trình đã đóng — chỉ xem.
                  </p>
                ) : null}
                <fieldset
                  disabled={project.stage === ProjectStage.CLOSED}
                  className="min-w-0"
                >
                  <AssignmentsTab
                    projectId={project.id}
                    assignments={assignments}
                    crew={crew}
                    roles={roles}
                  />
                </fieldset>
              </CardContent>
            </Card>
          )}
        </div>

        <ContextPane
          project={project}
          milestones={milestones}
          bills={bills}
          paperworkItems={paperworkItems}
        />
      </div>
    </>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectContracts } from "@/app/(dashboard)/contracts/queries";
import type { Contract } from "@/app/(dashboard)/contracts/types";
import { getDealQuote } from "@/app/(dashboard)/quotes/queries";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { getProjectMilestones } from "@/app/(dashboard)/receivables/queries";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";

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

  const isSurvey = project.stage === ProjectStage.SURVEY;
  const isContract = project.stage === ProjectStage.CONTRACT;
  const [attachments, contracts, milestones, dealQuote] = await Promise.all([
    isSurvey
      ? listProjectAttachments(project.id, "survey")
      : Promise.resolve<Attachment[]>([]),
    isContract
      ? getProjectContracts(project.id)
      : Promise.resolve<Contract[]>([]),
    isContract
      ? getProjectMilestones(project.id)
      : Promise.resolve<PaymentMilestone[]>([]),
    isContract
      ? getDealQuote(project.id)
      : Promise.resolve<Quote | undefined>(undefined),
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
        dealQuote={dealQuote}
        paperworkItems={paperworkItems}
      />
      <WorkspaceTabs project={project} paperworkItems={paperworkItems} />
    </>
  );
}

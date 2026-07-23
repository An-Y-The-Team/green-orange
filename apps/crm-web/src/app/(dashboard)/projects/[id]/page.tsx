import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProject, listPaperworkItems } from "../queries";
import { StagePanel } from "./components/stage-panel";
import { StageStepper } from "./components/stage-stepper";
import { WorkspaceHeader } from "./components/workspace-header";
import { WorkspaceTabs } from "./components/workspace-tabs";

// Guided "Công Trình workspace" — header (Zone 1), stage rail (Zone 2),
// stage panel + tabs (Zone 3). Stage panels are read-only stubs this phase.
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
      <StagePanel project={project} />
      <WorkspaceTabs project={project} paperworkItems={paperworkItems} />
    </>
  );
}

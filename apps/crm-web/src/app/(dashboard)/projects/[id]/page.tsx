import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";

import { listContracts } from "../../contracts/queries";
import { listQuotes } from "../../quotes/queries";
import { listPaymentMilestones } from "../../receivables/queries";
import { getProject, listAcceptances, listCosts } from "../queries";
import { ProjectDetailTabs } from "./components/project-detail-tabs/project-detail-tabs";

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

  // Fetch the related records and join them to this project by code. (The
  // backend could expose nested endpoints later; filtering here keeps the
  // mock↔API seam simple.)
  const [quotes, contracts, costs, acceptances, milestones] = await Promise.all(
    [
      listQuotes(),
      listContracts(),
      listCosts(),
      listAcceptances(),
      listPaymentMilestones(),
    ]
  );

  const byProject = <T extends { project_code: string }>(rows: T[]) =>
    rows.filter((r) => r.project_code === project.code);

  return (
    <>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <PageHeader title={project.name} description={project.code} />
      <ProjectDetailTabs
        project={project}
        quotes={byProject(quotes)}
        contracts={byProject(contracts)}
        costs={byProject(costs)}
        acceptances={byProject(acceptances)}
        milestones={byProject(milestones)}
      />
    </>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import {
  QuoteBuilderForm,
  type QuoteBuilderInitial,
} from "@/app/(dashboard)/projects/[id]/quotes/new/quote-builder-form";
import { listProjects } from "@/app/(dashboard)/projects/queries";
import { PageHeader } from "@/components/page-header";

// Standalone quote builder (crm-ui-redesign.md, 2026-07-24). Reuses the
// project-scoped builder with no project; the optional picker lets the author
// tie it to a project (which auto-advances that project to Báo giá).
export default async function NewQuotePage() {
  const projects = await listProjects();
  const options = projects.map((p) => ({
    id: p.id,
    label: `${p.code} · ${p.name}`,
  }));

  const initial: QuoteBuilderInitial = {
    projectId: undefined,
    projectCode: "",
    version: 1,
    items: [],
    vatPercent: 8,
    note: "",
  };

  return (
    <>
      <Link
        href="/quotes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại báo giá
      </Link>

      <PageHeader title="Lập báo giá" description="Báo giá mới" />

      <QuoteBuilderForm initial={initial} projects={options} />
    </>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDealQuote } from "@/app/(dashboard)/quotes/queries";
import { PageHeader } from "@/components/page-header";

import { getProject } from "../../../queries";
import {
  SettlementBuilderForm,
  type SettlementBuilderInitial,
} from "../settlement-builder-form";

// Settlement builder — stage-8 quyết toán. New settlements prefill their line
// items from the chốt (deal) quote: quantities carried as editable khối lượng
// thực tế, unit_price carried. Server computes amounts/total on save.
export default async function NewSettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const dealQuote = await getDealQuote(project.id);
  const items = (dealQuote?.items ?? []).map((it) => ({
    description: it.description,
    unit: it.unit ?? undefined,
    quantity: it.quantity,
    unit_price: it.unit_price,
  }));

  const initial: SettlementBuilderInitial = {
    projectId: project.id,
    projectCode: project.code,
    items,
    note: "",
  };

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại công trình
      </Link>

      <PageHeader
        title="Lập quyết toán"
        description={`${project.code} · ${project.name}`}
      />

      <SettlementBuilderForm initial={initial} />
    </>
  );
}

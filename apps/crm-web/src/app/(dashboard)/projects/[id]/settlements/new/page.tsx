import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getDealQuote } from "@/app/(dashboard)/quotes/queries";
import { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import { getProjectSettlements } from "@/app/(dashboard)/receivables/queries";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";
import { DEFAULT_VAT_RATE } from "@/utils/merge-template/merge-template";

import { getProject } from "../../../queries";
import {
  SettlementBuilderForm,
  type SettlementBuilderInitial,
} from "../settlement-builder-form/settlement-builder-form";

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

  // 1:1 — a project settles once, so an existing quyết toán is corrected, not
  // replaced (the server would 409 anyway).
  const [existing] = await getProjectSettlements(project.id);
  if (existing)
    redirect(
      existing.status === SettlementStatus.DRAFT
        ? `/projects/${project.id}/settlements/${existing.id}/edit`
        : `/projects/${project.id}`
    );

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
    discountAmount: 0,
    // Settle at the rate the job was priced at — a quyết toán that drops the
    // quote's VAT bills less than the hợp đồng says.
    vatPercent: Math.round((dealQuote?.vat_rate ?? DEFAULT_VAT_RATE) * 100),
    note: "",
  };

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {BACK_TO.project}
      </Link>

      <PageHeader
        title="Lập quyết toán"
        description={`${project.code} · ${project.name}`}
      />

      <SettlementBuilderForm initial={initial} />
    </>
  );
}

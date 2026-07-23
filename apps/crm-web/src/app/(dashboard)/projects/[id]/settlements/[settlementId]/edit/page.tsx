import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import { getProjectSettlements } from "@/app/(dashboard)/receivables/queries";
import { PageHeader } from "@/components/page-header";

import { getProject } from "../../../../queries";
import {
  SettlementBuilderForm,
  type SettlementBuilderInitial,
} from "../../settlement-builder-form";

// Edit a DRAFT settlement — loads its items into the builder (PATCH via
// updateSettlement). Non-drafts (items frozen) are not editable → 404.
export default async function EditSettlementPage({
  params,
}: {
  params: Promise<{ id: string; settlementId: string }>;
}) {
  const { id, settlementId } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const settlements = await getProjectSettlements(project.id);
  const settlement = settlements.find((s) => s.id === Number(settlementId));
  if (!settlement || settlement.status !== SettlementStatus.DRAFT) notFound();

  const initial: SettlementBuilderInitial = {
    projectId: project.id,
    projectCode: project.code,
    editId: settlement.id,
    items: settlement.items.map((it) => ({
      description: it.description,
      unit: it.unit ?? undefined,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    note: settlement.note ?? "",
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
        title="Sửa quyết toán"
        description={`${project.code} · QT #${settlement.id}`}
      />

      <SettlementBuilderForm initial={initial} />
    </>
  );
}

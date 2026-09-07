import { notFound } from "next/navigation";

import { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import { getProjectSettlements } from "@/app/(dashboard)/receivables/queries";
import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { getProject } from "../../../../queries";
import {
  SettlementBuilderForm,
  type SettlementBuilderInitial,
} from "../../settlement-builder-form/settlement-builder-form";

// Edit a nháp/đã gửi settlement — loads its items into the builder (PATCH via
// updateSettlement). Signed ones (items frozen) are not editable → 404.
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
  if (!settlement || settlement.status === SettlementStatus.SIGNED) notFound();

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
    discountAmount: settlement.discount_amount,
    vatPercent: Math.round(settlement.vat_rate * 100),
    note: settlement.note ?? "",
  };

  return (
    <>
      <BackLink href={`/projects/${project.id}`}>{BACK_TO.project}</BackLink>

      <PageHeader
        title="Sửa quyết toán"
        description={`${project.code} · QT #${settlement.id}`}
      />

      <SettlementBuilderForm initial={initial} />
    </>
  );
}

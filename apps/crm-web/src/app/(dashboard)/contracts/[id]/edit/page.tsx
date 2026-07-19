import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";

import { getQuoteByProjectCode } from "../../../quotes/queries";
import { getContract, getContractTemplate } from "../../queries";
import { ContractBodyEditor } from "./contract-body-editor";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await getContract(Number(id));

  if (!contract) {
    notFound();
  }

  // Seed the editor from the contract's own body, else from its template body.
  const template = contract.template_id
    ? await getContractTemplate(contract.template_id)
    : undefined;
  const initialBody = contract.body ?? template?.body ?? "";
  const docTitle = template?.doc_title ?? "HỢP ĐỒNG";
  const headerVariant = template?.header_style ?? "letterhead";
  const quote = await getQuoteByProjectCode(contract.project_code);
  const lineItems = quote
    ? { items: quote.items, vatRate: quote.vat_rate }
    : null;

  return (
    <>
      <Link
        href={`/contracts/${contract.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại tài liệu
      </Link>
      <PageHeader
        title="Chỉnh sửa nội dung hợp đồng"
        description={`${contract.code} · ${contract.client}`}
      />
      <ContractBodyEditor
        contract={contract}
        initialBody={initialBody}
        docTitle={docTitle}
        headerVariant={headerVariant}
        lineItems={lineItems}
      />
    </>
  );
}

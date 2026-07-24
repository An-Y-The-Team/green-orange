import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { DocxExportButton } from "@/components/editor/docx-export-button";
import { LexicalDocument } from "@/components/editor/lexical-document";
import { company } from "@/config/company";
import { formatDate, formatVND, quoteTotals } from "@/lib/format";
import { buildContractContext } from "@/lib/merge-template";

import { getDealQuote } from "../../quotes/queries";
import { getContract, getContractTemplate } from "../queries";

export default async function ContractDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await getContract(Number(id));

  if (!contract) {
    notFound();
  }

  const backLink = (
    <Link
      href="/contracts"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
    >
      <ArrowLeft className="size-4" />
      Quay lại danh sách
    </Link>
  );

  // The chốt quote drives the line-items block and the money merge tokens.
  const quote = contract.project_id
    ? await getDealQuote(contract.project_id)
    : undefined;

  // The contract's own rich body wins (edited per contract); otherwise seed from
  // its template body; otherwise fall back to the built-in hard-coded layout.
  const template = contract.template_id
    ? await getContractTemplate(contract.template_id)
    : undefined;
  const body = contract.body ?? template?.body;

  if (body) {
    const ctx = buildContractContext(contract, quote);
    const docTitle = template?.doc_title ?? "HỢP ĐỒNG";
    const headerVariant = template?.header_style ?? "letterhead";
    const lineItems = quote
      ? { items: quote.items, vatRate: quote.vat_rate }
      : null;
    return (
      <>
        {backLink}

        <DocumentShell
          title={docTitle}
          subtitle={`Số: ${contract.code}`}
          headerVariant={headerVariant}
          actions={
            <DocxExportButton
              body={body}
              ctx={ctx}
              lineItems={lineItems}
              title={docTitle}
              fileName={`${contract.code}.docx`}
            />
          }
        >
          <LexicalDocument body={body} ctx={ctx} lineItems={lineItems} />
          <SignatureBlocks />
        </DocumentShell>
      </>
    );
  }

  return (
    <>
      {backLink}

      <DocumentShell title="HỢP ĐỒNG DỊCH VỤ" subtitle={`Số: ${contract.code}`}>
        {contract.signed_date && (
          <p className="text-xs leading-relaxed text-zinc-600">
            Hôm nay, ngày {formatDate(contract.signed_date)}, hai bên gồm có:
          </p>
        )}

        <div className="mt-3 space-y-3 text-xs">
          <div>
            <p className="font-semibold uppercase">Bên A (Khách hàng)</p>
            <p>{contract.project?.client.name ?? "—"}</p>
          </div>
          <div>
            <p className="font-semibold uppercase">
              Bên B (Nhà cung cấp dịch vụ)
            </p>
            <p>{company.name}</p>
            <p className="text-zinc-600">
              {company.address} · MST: {company.tax_id}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div>
            <dt className="text-zinc-500">Công trình</dt>
            <dd>
              {contract.project
                ? `${contract.project.code} · ${contract.project.name}`
                : contract.project_id
                  ? `#${contract.project_id}`
                  : "Độc lập"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Ngày ký</dt>
            <dd>
              {contract.signed_date ? formatDate(contract.signed_date) : "—"}
            </dd>
          </div>
          {quote && (
            <div>
              <dt className="text-zinc-500">Giá trị (theo báo giá đã chốt)</dt>
              <dd className="font-semibold">
                {formatVND(quoteTotals(quote.items, quote.vat_rate).total)}
              </dd>
            </div>
          )}
        </dl>

        {contract.note && (
          <div className="mt-5 text-xs">
            <p className="font-semibold uppercase">Ghi chú</p>
            <p className="mt-1 leading-relaxed text-zinc-700">
              {contract.note}
            </p>
          </div>
        )}

        <SignatureBlocks />
      </DocumentShell>
    </>
  );
}

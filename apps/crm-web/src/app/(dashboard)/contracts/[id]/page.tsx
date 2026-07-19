import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@yan/ui/components/button";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { DocxExportButton } from "@/components/editor/docx-export-button";
import { LexicalDocument } from "@/components/editor/lexical-document";
import { company } from "@/config/company";
import { formatDate, formatVND } from "@/lib/format";
import { buildContractContext } from "@/lib/merge-template";

import { getQuoteByProjectCode } from "../../quotes/queries";
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

  // The contract's own rich body wins (edited per contract); otherwise seed from
  // its template body; otherwise fall back to the built-in hard-coded layout.
  const template = contract.template_id
    ? await getContractTemplate(contract.template_id)
    : undefined;
  const body = contract.body ?? template?.body;

  if (body) {
    const ctx = buildContractContext(contract);
    const docTitle = template?.doc_title ?? "HỢP ĐỒNG";
    const headerVariant = template?.header_style ?? "letterhead";
    // Resolve the linked báo giá to drive the line-items block (if any).
    const quote = await getQuoteByProjectCode(contract.project_code);
    const lineItems = quote
      ? { items: quote.items, vatRate: quote.vat_rate }
      : null;
    return (
      <>
        <div className="mb-4 flex items-center justify-between print:hidden">
          {backLink}
          <Link
            href={`/contracts/${contract.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil />
            Sửa nội dung
          </Link>
        </div>

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
        <p className="text-xs leading-relaxed text-zinc-600">
          Hôm nay, ngày {formatDate(contract.signed_date)}, hai bên gồm có:
        </p>

        <div className="mt-3 space-y-3 text-xs">
          <div>
            <p className="font-semibold uppercase">Bên A (Khách hàng)</p>
            <p>{contract.client}</p>
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

        <p className="mt-5 text-sm font-medium">{contract.title}</p>

        <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div>
            <dt className="text-zinc-500">Công trình</dt>
            <dd>{contract.project_code}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Giá trị hợp đồng</dt>
            <dd className="font-semibold">{formatVND(contract.value)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Ngày bắt đầu</dt>
            <dd>{formatDate(contract.start_date)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Ngày kết thúc</dt>
            <dd>{formatDate(contract.end_date)}</dd>
          </div>
        </dl>

        <div className="mt-5 text-xs">
          <p className="font-semibold uppercase">Điều khoản thanh toán</p>
          <p className="mt-1 leading-relaxed text-zinc-700">
            {contract.payment_terms}
          </p>
        </div>

        <SignatureBlocks />
      </DocumentShell>
    </>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { company } from "@/config/company";
import { formatDate, formatVND } from "@/lib/format";
import { buildContractContext, mergeTemplate } from "@/lib/merge-template";

import { ContractDocumentBody } from "../components/contract-document";
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

  // When the contract points at a template, render the merged document; the
  // built-in layout below stays as the fallback for template-less contracts.
  const template = contract.template_id
    ? await getContractTemplate(contract.template_id)
    : undefined;

  if (template) {
    const merged = mergeTemplate(template.body, buildContractContext(contract));
    return (
      <>
        <Link
          href="/contracts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>

        <DocumentShell
          title={template.doc_title}
          subtitle={`Số: ${contract.code}`}
        >
          <ContractDocumentBody body={merged} />
          <SignatureBlocks />
        </DocumentShell>
      </>
    );
  }

  return (
    <>
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <DocumentShell title="HỢP ĐỒNG DỊCH VỤ" subtitle={`Số: ${contract.code}`}>
        <p className="text-xs leading-relaxed text-zinc-600">
          Hôm nay, ngày {formatDate(contract.signed_date)}, hai bên gồm có:
        </p>

        <div className="mt-3 space-y-3 text-xs">
          <div>
            <p className="font-semibold uppercase">Bên A (Khách hàng)</p>
            <p>{contract.customer}</p>
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

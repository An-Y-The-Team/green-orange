import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@yan/ui/components/button";

import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import { parsePrintSnapshot } from "@/app/(dashboard)/contracts/print-snapshot";
import { loadCompany } from "@/app/(dashboard)/settings/company/queries";
import { CompanyProvider } from "@/components/company-provider/company-provider";
import { CompanyUnavailable } from "@/components/document-shell/company-unavailable";
import {
  DocumentShell,
  SignatureBlocks,
} from "@/components/document-shell/document-shell";
import { DocxExportButton } from "@/components/editor/docx-export-button/docx-export-button";
import { LexicalDocument } from "@/components/editor/lexical-document/lexical-document";
import { DEFAULT_HEADER_BLOCKS } from "@/constants/header-blocks";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { ensureLexicalBody } from "@/utils/lexical-build/lexical-build";
import { buildContractContext } from "@/utils/merge-template/merge-template";
import { storedTotals } from "@/utils/quote-totals/quote-totals";

import { getDealQuote } from "../../quotes/queries";
import { getContract, getContractTemplate } from "../queries";

export default async function ContractDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, { company, degraded }] = await Promise.all([
    getContract(Number(id)),
    loadCompany(),
  ]);

  if (!contract) {
    notFound();
  }

  const backLink = (
    <div className="mb-4 flex items-center justify-between print:hidden">
      <Link
        href="/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      {/* The editor lives under the project route, so standalone contracts
          (project_id null) have no edit surface — view/print only. A signed
          contract's content is frozen (the server enforces it too). */}
      {contract.project_id && contract.status === ContractStatus.DRAFT && (
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              href={`/projects/${contract.project_id}/contracts/new?edit=${contract.id}`}
            >
              <Pencil className="size-4" />
              Sửa
            </Link>
          }
        />
      )}
    </div>
  );

  // A signed contract prints from its frozen snapshot, so a later profile edit
  // (or an unreadable profile) cannot change it. Drafts render live.
  const snapshot = parsePrintSnapshot(contract.print_snapshot);
  const printCompany = snapshot?.company ?? company;

  // A contract states who Bên B legally is (name, MST, address, signatory).
  // Printing built-in defaults because the profile could not be read would put
  // the wrong party on a legal document — refuse, as with a missing quote.
  // A snapshot makes the live profile irrelevant, so it is not a blocker.
  if (degraded && !snapshot) {
    return (
      <>
        {backLink}
        <CompanyUnavailable what="Hợp đồng (kèm thông tin pháp lý Bên B)" />
      </>
    );
  }

  // The chốt quote drives the line-items block and the money merge tokens.
  const quote = contract.project_id
    ? await getDealQuote(contract.project_id)
    : undefined;

  // A project-linked contract takes its giá trị from the chốt quote. Without
  // one there is no agreed figure, so refuse the printable rather than emit a
  // blank one. (Standalone contracts never had a quote — unchanged.)
  if (contract.project_id && !quote) {
    return (
      <>
        {backLink}

        <div className="rounded-lg border border-border bg-muted/40 p-6 text-sm">
          <p className="font-medium">Chưa có báo giá chốt</p>
          <p className="mt-1 text-muted-foreground">
            Hợp đồng {contract.code} chỉ in được khi công trình đã có báo giá ở
            trạng thái Chốt — giá trị hợp đồng lấy từ báo giá đó.
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            render={
              <Link href={`/projects/${contract.project_id}`}>
                Mở công trình để chốt báo giá
              </Link>
            }
          />
        </div>
      </>
    );
  }

  // The contract's own rich body wins (edited per contract); otherwise seed from
  // its template body; otherwise fall back to the built-in hard-coded layout.
  const template = contract.template_id
    ? await getContractTemplate(contract.template_id)
    : undefined;
  // ensureLexicalBody: v1-era contracts stored plain text — wrap it so older
  // contracts still print/export instead of rendering "(Chưa có nội dung)".
  const body = ensureLexicalBody(contract.body ?? template?.body);

  if (body) {
    const ctx = buildContractContext(contract, quote, printCompany);
    const docTitle = snapshot?.doc_title ?? template?.doc_title ?? "HỢP ĐỒNG";
    // Frozen blocks win for a signed contract; else the template's choice;
    // else both (the compliant default).
    const headerBlocks =
      snapshot?.header_blocks ??
      (template
        ? {
            letterhead: template.show_letterhead ?? true,
            national: template.show_national ?? true,
          }
        : DEFAULT_HEADER_BLOCKS);
    const lineItems = quote
      ? { items: quote.items, vatRate: quote.vat_rate }
      : null;
    return (
      <>
        {backLink}

        {/* The shell's letterhead, header template and Bên B signature
            default all read the company from context — feed it the frozen
            copy so a signed contract reprints as it was signed. */}
        <CompanyProvider company={printCompany}>
          <DocumentShell
            title={docTitle}
            subtitle={`Số: ${contract.code}`}
            headerBlocks={headerBlocks}
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
            <SignatureBlocks
              leftLabel={contract.rep_a_label ?? undefined}
              leftName={contract.rep_a_name ?? undefined}
              leftTitle={contract.rep_a_title ?? undefined}
              rightLabel={contract.rep_b_label ?? undefined}
              rightName={contract.rep_b_name ?? undefined}
              rightTitle={contract.rep_b_title ?? undefined}
            />
          </DocumentShell>
        </CompanyProvider>
      </>
    );
  }

  return (
    <>
      {backLink}

      {/* Frozen company too — same reason as the rich-body branch above. */}
      <CompanyProvider company={printCompany}>
        <DocumentShell
          title="HỢP ĐỒNG DỊCH VỤ"
          subtitle={`Số: ${contract.code}`}
          headerBlocks={snapshot?.header_blocks ?? DEFAULT_HEADER_BLOCKS}
        >
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
              <p>{printCompany.name}</p>
              <p className="text-zinc-600">
                {printCompany.address} · MST: {printCompany.tax_id}
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
                <dt className="text-zinc-500">
                  Giá trị (theo báo giá đã chốt)
                </dt>
                <dd className="font-semibold">
                  {formatVND(storedTotals(quote).total)}
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

          <SignatureBlocks
            leftLabel={contract.rep_a_label ?? undefined}
            leftName={contract.rep_a_name ?? undefined}
            leftTitle={contract.rep_a_title ?? undefined}
            rightLabel={contract.rep_b_label ?? undefined}
            rightName={contract.rep_b_name ?? undefined}
            rightTitle={contract.rep_b_title ?? undefined}
          />
        </DocumentShell>
      </CompanyProvider>
    </>
  );
}

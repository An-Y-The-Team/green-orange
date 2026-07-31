"use client";

import { Printer } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { useCompany } from "@/components/company-provider/company-provider";
import { LexicalDocument } from "@/components/editor/lexical-document/lexical-document";
import {
  DEFAULT_HEADER_BLOCKS,
  type HeaderBlocks,
} from "@/constants/header-blocks";
import { companyContext } from "@/utils/merge-template/merge-template";

/**
 * A4-styled white sheet for printable documents (Báo giá / Quyết toán / Hợp
 * đồng). Renders a header (company letterhead, or the Vietnamese national motto
 * for legal contracts), a document title, and the caller's content. The "In /
 * Tải PDF" button triggers the browser print dialog; the dashboard chrome is
 * hidden in print via `print:hidden` utilities in the layout, and `.print-sheet`
 * (styled in globals.css) flattens this sheet for printing.
 */
export function DocumentShell({
  title,
  subtitle,
  actions,
  headerBlocks = DEFAULT_HEADER_BLOCKS,
  children,
}: {
  /** Usually a string; the template editor passes an inline title input. */
  title: React.ReactNode;
  subtitle?: string;
  /** Optional extra controls (e.g. "Xuất .docx") shown beside the print button. */
  actions?: React.ReactNode;
  /** Which header blocks to print; defaults to both. */
  headerBlocks?: HeaderBlocks;
  children: React.ReactNode;
}) {
  const company = useCompany();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        {actions}
        <Button size="sm" onClick={() => window.print()}>
          <Printer />
          In / Tải PDF
        </Button>
      </div>

      <div className="print-sheet mx-auto bg-white p-10 text-sm text-zinc-900 shadow-sm ring-1 ring-border">
        {/* Two independent blocks from settings → Thông tin công ty. Official
            Vietnamese paperwork carries the Quốc hiệu with the letterhead above
            it, so both print by default; a template may switch either off. */}
        {headerBlocks.letterhead && (
          <header className="border-b border-zinc-300 pb-5">
            <div className="flex items-start gap-3">
              {company.logo ? (
                /* A stored data URL; next/image would need a loader it cannot
                 apply here. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo}
                  alt=""
                  className="h-12 w-auto max-w-32 shrink-0 object-contain"
                />
              ) : null}
              <LexicalDocument
                body={company.letterhead_body}
                ctx={companyContext(company)}
                className="flex-1 space-y-0.5 text-xs leading-relaxed text-zinc-900"
              />
            </div>
          </header>
        )}

        {headerBlocks.national && (
          <div className="pt-5">
            <LexicalDocument
              body={company.national_body}
              ctx={companyContext(company)}
              className="space-y-1 text-xs leading-relaxed text-zinc-900"
            />
          </div>
        )}

        {/* Document title */}
        <div className="py-6 text-center">
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-xs text-zinc-600">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}

/**
 * Two-column signature blocks (Bên A / Bên B) shared by the documents. Party B
 * defaults to the company's legal representative; pass names/titles to override
 * or to fill Party A.
 */
export function SignatureBlocks({
  leftLabel = "ĐẠI DIỆN BÊN A",
  rightLabel = "ĐẠI DIỆN BÊN B",
  leftName,
  leftTitle,
  rightName,
  rightTitle,
}: {
  leftLabel?: string;
  rightLabel?: string;
  leftName?: string;
  leftTitle?: string;
  rightName?: string;
  rightTitle?: string;
}) {
  const company = useCompany();
  const columns = [
    { label: leftLabel, name: leftName, title: leftTitle },
    {
      label: rightLabel,
      name: rightName ?? company.representative,
      title: rightTitle ?? company.representative_title,
    },
  ];
  return (
    <div className="mt-10 grid grid-cols-2 gap-8 break-inside-avoid text-center text-xs">
      {columns.map((col) => (
        <div key={col.label}>
          <p className="font-semibold uppercase">{col.label}</p>
          <p className="mt-1 italic text-zinc-500">(Ký, ghi rõ họ tên)</p>
          <div className="h-20" />
          {col.name && <p className="font-semibold uppercase">{col.name}</p>}
          {col.title && <p className="text-zinc-600">{col.title}</p>}
        </div>
      ))}
    </div>
  );
}

"use client";

import { Printer } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { company } from "@/config/company";

/** Header style for the printable sheet. */
export type HeaderVariant = "letterhead" | "national";

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
  headerVariant = "letterhead",
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional extra controls (e.g. "Xuất .docx") shown beside the print button. */
  actions?: React.ReactNode;
  /** "letterhead" (company branding) or "national" (CHXHCN VN motto). */
  headerVariant?: HeaderVariant;
  children: React.ReactNode;
}) {
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
        {headerVariant === "national" ? (
          // National header for legal documents (Hợp đồng).
          <header className="text-center">
            <p className="text-sm font-bold uppercase">
              Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam
            </p>
            <p className="text-sm font-bold">Độc Lập – Tự Do – Hạnh Phúc</p>
            <p className="mt-1 tracking-widest text-zinc-500">———oOo———</p>
          </header>
        ) : (
          // Company letterhead for quotes / settlements.
          <header className="flex items-start justify-between gap-6 border-b border-zinc-300 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-md bg-emerald-600 text-base font-bold text-white">
                G
              </div>
              <div>
                <p className="text-sm font-bold uppercase leading-tight">
                  {company.name}
                </p>
                <p className="text-xs text-zinc-600">{company.tagline}</p>
              </div>
            </div>
            <div className="text-right text-xs leading-relaxed text-zinc-600">
              <p>{company.address}</p>
              <p>
                ĐT: {company.phone} · {company.email}
              </p>
              <p>MST: {company.tax_id}</p>
            </div>
          </header>
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
  rightName = company.representative,
  rightTitle = company.representative_title,
}: {
  leftLabel?: string;
  rightLabel?: string;
  leftName?: string;
  leftTitle?: string;
  rightName?: string;
  rightTitle?: string;
}) {
  const columns = [
    { label: leftLabel, name: leftName, title: leftTitle },
    { label: rightLabel, name: rightName, title: rightTitle },
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

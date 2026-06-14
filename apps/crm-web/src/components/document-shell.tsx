"use client";

import { Printer } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { company } from "@/config/company";

/**
 * A4-styled white sheet for printable documents (Báo giá / Quyết toán / Hợp
 * đồng). Renders the company letterhead, a document title, and the caller's
 * content. The "In / Tải PDF" button triggers the browser print dialog; the
 * dashboard chrome is hidden in print via `print:hidden` utilities in the
 * layout, and `.print-sheet` (styled in globals.css) flattens this sheet for
 * printing.
 */
export function DocumentShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          <Printer />
          In / Tải PDF
        </Button>
      </div>

      <div className="print-sheet mx-auto bg-white p-10 text-sm text-zinc-900 shadow-sm ring-1 ring-border">
        {/* Letterhead */}
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

/** Two-column signature blocks (Bên A / Bên B) shared by the documents. */
export function SignatureBlocks({
  left = "ĐẠI DIỆN BÊN A (Khách hàng)",
  right = "ĐẠI DIỆN BÊN B (GreenOrange)",
}: {
  left?: string;
  right?: string;
}) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
      {[left, right].map((label) => (
        <div key={label}>
          <p className="font-semibold uppercase">{label}</p>
          <p className="mt-1 italic text-zinc-500">(Ký, ghi rõ họ tên)</p>
          <div className="h-20" />
        </div>
      ))}
    </div>
  );
}

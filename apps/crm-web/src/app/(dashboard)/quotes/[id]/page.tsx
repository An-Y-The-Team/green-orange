import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { formatDate, formatVND, quoteTotals } from "@/lib/format";
import { quoteChannel, quoteStatus, quoteSuperseded } from "@/lib/labels";

import { getProjectQuotes, getQuote } from "../queries";

export default async function QuoteDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(Number(id));

  if (!quote) {
    notFound();
  }

  // Standalone quotes have no sibling versions to supersede them.
  const versions = quote.project_id
    ? await getProjectQuotes(quote.project_id)
    : [quote];
  const superseded = versions.some((v) => v.version > quote.version);
  const badge = superseded ? quoteSuperseded : quoteStatus[quote.status];
  const { subtotal, vat, total } = quoteTotals(quote.items, quote.vat_rate);

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <DocumentShell
        title="BÁO GIÁ DỊCH VỤ"
        subtitle={
          quote.project_id
            ? `Phiên bản ${quote.version} · Công trình #${quote.project_id}`
            : `Phiên bản ${quote.version} · Báo giá độc lập`
        }
      >
        <div className="relative">
          {/* Superseded watermark — older versions stay printable but marked. */}
          {superseded && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <span className="-rotate-[30deg] text-5xl font-bold uppercase tracking-widest text-red-600/15">
                Đã thay thế
              </span>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            {quote.project_id ? (
              <p>
                <span className="text-zinc-500">Công trình: </span>
                <span className="font-medium">#{quote.project_id}</span>
              </p>
            ) : null}
            <p>
              <span className="text-zinc-500">Phiên bản: </span>v{quote.version}
            </p>
            {quote.send_logs.length > 0 && (
              <p>
                <span className="text-zinc-500">Đã gửi: </span>
                {quote.send_logs
                  .map(
                    (l) =>
                      `${quoteChannel[l.channel]} ${formatDate(l.sent_at)} (${l.sent_by})`
                  )
                  .join(" · ")}
              </p>
            )}
            {quote.decided_date && (
              <p>
                <span className="text-zinc-500">Ngày quyết định: </span>
                {formatDate(quote.decided_date)}
              </p>
            )}
          </div>

          {/* Line items */}
          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-zinc-300 bg-zinc-50 text-left">
                <th className="w-8 px-2 py-2">#</th>
                <th className="px-2 py-2">Hạng mục</th>
                <th className="px-2 py-2 text-center">ĐVT</th>
                <th className="px-2 py-2 text-right">SL</th>
                <th className="px-2 py-2 text-right">Đơn giá</th>
                <th className="px-2 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index} className="border-b border-zinc-200">
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="px-2 py-2">{item.description}</td>
                  <td className="px-2 py-2 text-center">{item.unit}</td>
                  <td className="px-2 py-2 text-right">{item.quantity}</td>
                  <td className="px-2 py-2 text-right">
                    {formatVND(item.unit_price)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatVND(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-3 ml-auto w-64 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Tạm tính</span>
              <span>{formatVND(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">
                VAT ({Math.round(quote.vat_rate * 100)}%)
              </span>
              <span>{formatVND(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-1 text-sm font-bold">
              <span>Tổng cộng</span>
              <span>{formatVND(total)}</span>
            </div>
          </div>

          {/* Terms block */}
          {quote.note && (
            <p className="mt-5 text-xs text-zinc-600">
              <span className="font-medium">Điều khoản & ghi chú: </span>
              {quote.note}
            </p>
          )}

          <SignatureBlocks />
        </div>
      </DocumentShell>
    </>
  );
}

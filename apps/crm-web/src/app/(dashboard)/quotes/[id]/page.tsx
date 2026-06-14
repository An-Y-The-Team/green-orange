import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { formatDate, formatVND, quoteTotals } from "@/lib/format";
import { quoteType } from "@/lib/labels";

import { getQuote } from "../queries";

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

  const { subtotal, vat, total } = quoteTotals(quote.items, quote.vat_rate);
  const title =
    quote.type === "quyet_toan" ? "BẢNG QUYẾT TOÁN" : "BÁO GIÁ DỊCH VỤ";

  return (
    <>
      <Link
        href="/quotes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <DocumentShell title={title} subtitle={`Số: ${quote.code}`}>
        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <p>
            <span className="text-zinc-500">Khách hàng: </span>
            <span className="font-medium">{quote.customer}</span>
          </p>
          <p>
            <span className="text-zinc-500">Loại: </span>
            {quoteType[quote.type]}
          </p>
          <p>
            <span className="text-zinc-500">Công trình: </span>
            {quote.project_code}
          </p>
          <p>
            <span className="text-zinc-500">Ngày lập: </span>
            {formatDate(quote.issue_date)}
          </p>
          <p className="col-span-2">
            <span className="text-zinc-500">Hiệu lực đến: </span>
            {formatDate(quote.valid_until)}
          </p>
        </div>

        <p className="mt-4 text-sm font-medium">{quote.title}</p>

        {/* Line items */}
        <table className="mt-3 w-full border-collapse text-xs">
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
                  {formatVND(item.quantity * item.unit_price)}
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

        {quote.notes && (
          <p className="mt-5 text-xs text-zinc-600">
            <span className="font-medium">Ghi chú: </span>
            {quote.notes}
          </p>
        )}

        <SignatureBlocks />
      </DocumentShell>
    </>
  );
}

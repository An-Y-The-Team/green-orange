import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";

import { getProjectSettlements } from "@/app/(dashboard)/receivables/queries";
import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { formatDate, formatVND } from "@/lib/format";
import { settlementStatus } from "@/lib/labels";

import { getProject } from "../../../../queries";

// Printable Biên bản quyết toán — settlement line-items + total, letterhead.
// Follows quotes/[id]/page.tsx (DocumentShell + SignatureBlocks).
export default async function SettlementDocumentPage({
  params,
}: {
  params: Promise<{ id: string; settlementId: string }>;
}) {
  const { id, settlementId } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const settlements = await getProjectSettlements(project.id);
  const settlement = settlements.find((s) => s.id === Number(settlementId));
  if (!settlement) notFound();

  const badge = settlementStatus[settlement.status];

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Quay lại công trình
        </Link>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <DocumentShell
        title="BIÊN BẢN QUYẾT TOÁN"
        subtitle={`QT #${settlement.id} · ${project.code} · ${project.name}`}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <p>
            <span className="text-zinc-500">Công trình: </span>
            <span className="font-medium">{project.code}</span>
          </p>
          {settlement.signed_date ? (
            <p>
              <span className="text-zinc-500">Ngày ký: </span>
              {formatDate(settlement.signed_date)}
            </p>
          ) : null}
          {project.client?.name ? (
            <p>
              <span className="text-zinc-500">Khách hàng: </span>
              {project.client.name}
            </p>
          ) : null}
        </div>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-zinc-300 bg-zinc-50 text-left">
              <th className="w-8 px-2 py-2">#</th>
              <th className="px-2 py-2">Hạng mục</th>
              <th className="px-2 py-2 text-center">ĐVT</th>
              <th className="px-2 py-2 text-right">Khối lượng</th>
              <th className="px-2 py-2 text-right">Đơn giá</th>
              <th className="px-2 py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {settlement.items.map((item, index) => (
              <tr key={item.id} className="border-b border-zinc-200">
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

        <div className="mt-3 ml-auto w-64 space-y-1 text-xs">
          <div className="flex justify-between border-t border-zinc-300 pt-1 text-sm font-bold">
            <span>Tổng quyết toán</span>
            <span>{formatVND(settlement.total_amount)}</span>
          </div>
        </div>

        {settlement.note ? (
          <p className="mt-5 text-xs text-zinc-600">
            <span className="font-medium">Ghi chú: </span>
            {settlement.note}
          </p>
        ) : null}

        <SignatureBlocks leftLabel="ĐẠI DIỆN KHÁCH HÀNG" />
      </DocumentShell>
    </>
  );
}

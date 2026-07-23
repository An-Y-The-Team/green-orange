import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";

import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import {
  getProjectBills,
  getProjectMilestones,
} from "@/app/(dashboard)/receivables/queries";
import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { company } from "@/config/company";
import { formatDate, formatVND, isOverdue } from "@/lib/format";
import {
  billStatus,
  milestoneStatus,
  milestoneType,
  overdue,
} from "@/lib/labels";

import { getProject } from "../../../../queries";

// Printable "Đề nghị thanh toán" — an internal payment request (the real VAT
// e-invoice lives outside the CRM). Bill total + its đợt + company bank details.
export default async function BillDocumentPage({
  params,
}: {
  params: Promise<{ id: string; billId: string }>;
}) {
  const { id, billId } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const bills = await getProjectBills(project.id);
  const bill = bills.find((b) => b.id === Number(billId));
  if (!bill) notFound();

  const allMilestones =
    bill.milestones ?? (await getProjectMilestones(project.id));
  const milestones = bill.milestones
    ? bill.milestones
    : allMilestones.filter((m) => m.bill_id === bill.id);

  const badge = billStatus[bill.status];

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
        title="ĐỀ NGHỊ THANH TOÁN"
        subtitle={`HĐ #${bill.id} · ${project.code} · ${project.name}`}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <p>
            <span className="text-zinc-500">Công trình: </span>
            <span className="font-medium">{project.code}</span>
          </p>
          {project.client?.name ? (
            <p>
              <span className="text-zinc-500">Khách hàng: </span>
              {project.client.name}
            </p>
          ) : null}
        </div>

        {milestones.length > 0 ? (
          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-zinc-300 bg-zinc-50 text-left">
                <th className="w-8 px-2 py-2">#</th>
                <th className="px-2 py-2">Đợt thanh toán</th>
                <th className="px-2 py-2">Hạn thu</th>
                <th className="px-2 py-2">Trạng thái</th>
                <th className="px-2 py-2 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m, index) => {
                const paid = m.status === MilestoneStatus.PAID;
                const late = isOverdue(m.due_date, paid);
                const label = late ? overdue : milestoneStatus[m.status];
                return (
                  <tr key={m.id} className="border-b border-zinc-200">
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2">{milestoneType[m.type]}</td>
                    <td className="px-2 py-2">
                      {m.due_date ? formatDate(m.due_date) : "—"}
                    </td>
                    <td className="px-2 py-2">{label.label}</td>
                    <td className="px-2 py-2 text-right">
                      {formatVND(m.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        <div className="mt-3 ml-auto w-64 space-y-1 text-xs">
          <div className="flex justify-between border-t border-zinc-300 pt-1 text-sm font-bold">
            <span>Tổng cộng</span>
            <span>{formatVND(bill.total_amount)}</span>
          </div>
        </div>

        {/* Bank details for the transfer */}
        <div className="mt-6 rounded-md bg-zinc-50 p-4 text-xs leading-relaxed">
          <p className="font-medium uppercase">Thông tin chuyển khoản</p>
          <p>
            <span className="text-zinc-500">Đơn vị thụ hưởng: </span>
            {company.name}
          </p>
          <p>
            <span className="text-zinc-500">Số tài khoản: </span>
            {company.bank_account}
          </p>
          <p>
            <span className="text-zinc-500">Ngân hàng: </span>
            {company.bank_name} — {company.bank_branch}
          </p>
          <p>
            <span className="text-zinc-500">Nội dung: </span>
            Thanh toan {project.code} HD {bill.id}
          </p>
        </div>

        <SignatureBlocks leftLabel="ĐẠI DIỆN KHÁCH HÀNG" />
      </DocumentShell>
    </>
  );
}

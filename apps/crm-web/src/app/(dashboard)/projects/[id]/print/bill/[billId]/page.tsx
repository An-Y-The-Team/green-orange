import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";

import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import {
  getProjectBills,
  getProjectMilestones,
} from "@/app/(dashboard)/receivables/queries";
import { loadCompany } from "@/app/(dashboard)/settings/company/queries";
import { CompanyUnavailable } from "@/components/document-shell/company-unavailable";
import {
  DocumentShell,
  SignatureBlocks,
} from "@/components/document-shell/document-shell";
import {
  BACK_TO,
  BILL_STATUSES,
  DOCUMENT_TEXT,
  FIELDS,
  MILESTONE_STATUSES,
  MILESTONE_TYPES,
  OVERDUE_LABEL,
} from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { labelOf } from "@/utils/label-of/label-of";
import { vndInWords } from "@/utils/vnd-in-words/vnd-in-words";

import { getProject } from "../../../../queries";

// Printable "Đề nghị thanh toán" — an internal payment request (the real VAT
// e-invoice lives outside the CRM). Bill total + its đợt + company bank details.
export default async function BillDocumentPage({
  params,
}: {
  params: Promise<{ id: string; billId: string }>;
}) {
  const { id, billId } = await params;
  const { company, degraded } = await loadCompany();
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

  const badge = labelOf(BILL_STATUSES, bill.status);

  const backLink = (
    <div className="mb-4 flex items-center justify-between print:hidden">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {BACK_TO.project}
      </Link>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
  );

  // This document instructs the client where to wire money. Printing the
  // built-in default account because the profile could not be read would be a
  // silent, expensive error — refuse instead.
  if (degraded) {
    return (
      <>
        {backLink}
        <CompanyUnavailable what="Đề nghị thanh toán (kèm số tài khoản nhận tiền)" />
      </>
    );
  }

  return (
    <>
      {backLink}

      <DocumentShell
        title="GIẤY ĐỀ NGHỊ THANH TOÁN"
        subtitle={`HĐ #${bill.id} · ${project.code} · ${project.name}`}
      >
        {/* Kính gửi + căn cứ, as on the paper form (xlsx "đề nghị thanh toán"). */}
        <div className="space-y-1 text-xs leading-relaxed">
          <p>
            <span className="text-zinc-500">Kính gửi: </span>
            <span className="font-medium uppercase">
              {project.client?.name ?? "—"}
            </span>
          </p>
          {project.location?.address ? (
            <p>
              <span className="text-zinc-500">Địa chỉ: </span>
              {project.location.address}
            </p>
          ) : null}
          <p>
            <span className="text-zinc-500">Công trình: </span>
            <span className="font-medium">
              {project.code} · {project.name}
            </span>
          </p>
          {project.types?.length ? (
            <p>
              <span className="text-zinc-500">Hạng mục: </span>
              {project.types.map((t) => t.name).join(", ")}
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-0.5 text-xs leading-relaxed">
          <p>- Căn cứ vào biên bản nghiệm thu công trình giữa hai bên;</p>
          <p>- Căn cứ vào bảng giá trị quyết toán khối lượng;</p>
          <p>- Căn cứ vào biên bản quyết toán.</p>
        </div>

        {milestones.length > 0 ? (
          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-zinc-300 bg-zinc-50 text-left">
                <th className="w-8 px-2 py-2">#</th>
                <th className="px-2 py-2">{FIELDS.paymentMilestone}</th>
                <th className="px-2 py-2">{FIELDS.dueDate}</th>
                <th className="px-2 py-2">{FIELDS.status}</th>
                <th className="px-2 py-2 text-right">{FIELDS.amount}</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m, index) => {
                const paid = m.status === MilestoneStatus.PAID;
                const late = isOverdue(m.due_date, paid);
                const label = late
                  ? OVERDUE_LABEL
                  : labelOf(MILESTONE_STATUSES, m.status);
                return (
                  <tr key={m.id} className="border-b border-zinc-200">
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2">
                      {MILESTONE_TYPES[m.type] ?? m.type}
                    </td>
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
            <span>{DOCUMENT_TEXT.grandTotal}</span>
            <span>{formatVND(bill.total_amount)}</span>
          </div>
        </div>

        {/* The request sentence itself — the figure in words is what the payer
            checks against the numeral. */}
        <p className="mt-5 text-xs leading-relaxed">
          {company.name} đề nghị Quý Công ty {project.client?.name ?? ""} thanh
          toán số tiền{" "}
          <span className="font-semibold">{formatVND(bill.total_amount)}</span>{" "}
          (Bằng chữ: {vndInWords(bill.total_amount)}).
        </p>

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

        <p className="mt-5 text-xs leading-relaxed">
          Rất mong sự hợp tác của Quý Công ty. Trân trọng cảm ơn!
        </p>

        <SignatureBlocks leftLabel={DOCUMENT_TEXT.clientSignatory} />
      </DocumentShell>
    </>
  );
}

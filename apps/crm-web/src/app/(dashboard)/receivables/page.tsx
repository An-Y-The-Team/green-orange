import { Card, CardHeader, CardTitle } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";
import { isOverdue } from "@/utils/is-overdue/is-overdue";

import { MilestoneStatus } from "./enums";
import { listBills, listPaymentMilestones } from "./queries";
import { BillRow, MilestoneRow } from "./receivable-rows/receivable-rows";
import type { ProjectRef } from "./types";

// Rows per table. Explicit rather than leaning on the server's default page size,
// so the notice below is accurate instead of a guess.
const PAGE_ROWS = 100;

// Both tables show one page, and the overdue-first sort below runs in JS over
// that page — so an overdue row on page 2 never surfaces. Say so rather than
// implying the table is complete. Goes away with URL-driven paging (F17/F30) or
// a server-side overdue-first order.
function PageLimitNotice({ shown }: { shown: number }) {
  if (shown < PAGE_ROWS) return null;
  return (
    <p className="px-6 text-xs text-muted-foreground">
      Đang xem {PAGE_ROWS} dòng đầu — còn dòng chưa hiển thị.
    </p>
  );
}

// Công trình column. Both lists carry the code as a narrow `project` include
// (F40), so no projects fetch and no id → code map: the old map came from one
// paginated /projects window, and any row outside it printed `#id`.
const projectCode = (row: { project_id: number; project?: ProjectRef }) =>
  row?.project?.code ?? `#${row?.project_id}`;

// Thu & công nợ — the secretary's daily money screen. Read-only columns plus
// row actions (record payment, mark bill sent/paid) driven by the write phase.
export default async function ReceivablesPage() {
  const [milestones, bills] = await Promise.all([
    listPaymentMilestones({ limit: PAGE_ROWS }),
    listBills({ limit: PAGE_ROWS }),
  ]);

  const milestoneOverdue = (m: (typeof milestones)[number]) =>
    isOverdue(m?.due_date, m?.status === MilestoneStatus.PAID);
  // Derived overdue on top (design doc), everything else in API order.
  const sorted = [...milestones].sort(
    (a, b) => Number(milestoneOverdue(b)) - Number(milestoneOverdue(a))
  );

  return (
    <>
      <PageHeader
        title="Thu & công nợ"
        description="Đợt thanh toán và hóa đơn của các công trình."
      />

      <div className="grid gap-6">
        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">
              {FIELDS.paymentMilestone}
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{FIELDS.project}</TableHead>
                <TableHead>Đợt</TableHead>
                <TableHead className="text-right">{FIELDS.amount}</TableHead>
                <TableHead>{FIELDS.dueDate}</TableHead>
                <TableHead>{FIELDS.status}</TableHead>
                <TableHead>{FIELDS.collectDate}</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m) => (
                <MilestoneRow
                  key={m?.id}
                  milestone={m}
                  projectCode={projectCode(m)}
                />
              ))}
            </TableBody>
          </Table>
          <PageLimitNotice shown={sorted.length} />
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">Hóa đơn</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{FIELDS.project}</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead>{FIELDS.status}</TableHead>
                <TableHead>Ngày gửi</TableHead>
                <TableHead>Ngày thanh toán</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <BillRow key={b?.id} bill={b} projectCode={projectCode(b)} />
              ))}
            </TableBody>
          </Table>
          <PageLimitNotice shown={bills.length} />
        </Card>
      </div>
    </>
  );
}

import { Card, CardHeader, CardTitle } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { isOverdue } from "@/lib/format";

import { listProjects } from "../projects/queries";
import { MilestoneStatus } from "./enums";
import { listBills, listPaymentMilestones } from "./queries";
import { BillRow, MilestoneRow } from "./receivable-rows";

// Thu & công nợ — the secretary's daily money screen. Read-only columns plus
// row actions (record payment, mark bill sent/paid) driven by the write phase.
export default async function ReceivablesPage() {
  const [milestones, bills, projects] = await Promise.all([
    listPaymentMilestones(),
    listBills(),
    listProjects(),
  ]);
  const projectCode = (id: number) =>
    projects.find((p) => p.id === id)?.code ?? `#${id}`;

  const milestoneOverdue = (m: (typeof milestones)[number]) =>
    isOverdue(m.due_date, m.status === MilestoneStatus.PAID);
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
            <CardTitle className="text-base">Đợt thanh toán</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Công trình</TableHead>
                <TableHead>Đợt</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Hạn thu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày thu</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  projectCode={projectCode(m.project_id)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">Hóa đơn</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Công trình</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày gửi</TableHead>
                <TableHead>Ngày thanh toán</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <BillRow
                  key={b.id}
                  bill={b}
                  projectCode={projectCode(b.project_id)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

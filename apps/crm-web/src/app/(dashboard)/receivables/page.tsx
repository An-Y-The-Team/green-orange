import { Badge } from "@yan/ui/components/badge";
import { Card, CardHeader, CardTitle } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { formatDate, formatVND, isOverdue } from "@/lib/format";
import {
  billStatus,
  milestoneStatus,
  milestoneType,
  overdue,
} from "@/lib/labels";

import { listProjects } from "../projects/queries";
import { MilestoneStatus } from "./enums";
import { listBills, listPaymentMilestones } from "./queries";

// Thu & công nợ — the secretary's daily money screen. Read-only (phase 1):
// row actions (record payment, mark bill sent/paid) come with the write phase.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m) => {
                const badge = milestoneOverdue(m)
                  ? overdue
                  : milestoneStatus[m.status];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {projectCode(m.project_id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {milestoneType[m.type]}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVND(m.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.due_date ? formatDate(m.due_date) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.paid_date ? formatDate(m.paid_date) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {projectCode(b.project_id)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(b.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={billStatus[b.status].variant}>
                      {billStatus[b.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.sent_date ? formatDate(b.sent_date) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.paid_date ? formatDate(b.paid_date) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

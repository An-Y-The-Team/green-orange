import { Lock } from "lucide-react";

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
import { formatDate, formatVND, receivables } from "@/lib/format";
import { milestoneStatus, milestoneType } from "@/lib/labels";

import { PaymentMilestoneFormDialog } from "./components/payment-milestone-form-dialog/payment-milestone-form-dialog";
import { listPaymentMilestones } from "./queries";

export default async function ReceivablesPage() {
  const milestones = await listPaymentMilestones();
  const { total_due, total_paid, outstanding, retention } =
    receivables(milestones);

  const kpis = [
    { label: "Tổng giá trị hợp đồng", value: formatVND(total_due) },
    { label: "Đã thu", value: formatVND(total_paid) },
    { label: "Còn phải thu", value: formatVND(outstanding) },
    { label: "Giữ lại bảo hành", value: formatVND(retention) },
  ];

  return (
    <>
      <PageHeader
        title="Thu / Nợ"
        description="Lịch thanh toán theo đợt và công nợ của các hợp đồng."
        action={<PaymentMilestoneFormDialog />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className="text-xl font-semibold">{kpi.value}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hợp đồng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Đợt</TableHead>
              <TableHead>Hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Phải thu</TableHead>
              <TableHead className="text-right">Đã thu</TableHead>
              <TableHead className="text-right">Còn nợ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((m) => {
              const locked = m.gated_by_acceptance && m.status !== "da_thu";
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.contract_code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.customer}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {locked && (
                        <Lock className="size-3.5 text-muted-foreground" />
                      )}
                      {m.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {milestoneType[m.type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(m.due_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={milestoneStatus[m.status].variant}>
                      {locked
                        ? "Chờ nghiệm thu"
                        : milestoneStatus[m.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(m.due_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(m.paid_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(m.due_amount - m.paid_amount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

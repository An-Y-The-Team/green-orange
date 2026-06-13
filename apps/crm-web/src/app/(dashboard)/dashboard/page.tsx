import { Badge } from "@yan/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { listCustomers, listDeals, listLeads, listTasks } from "@/lib/api";
import { formatUSD } from "@/lib/format";

const dealStageVariant = {
  prospect: "secondary",
  proposal: "default",
  negotiation: "warning",
  won: "success",
  lost: "destructive",
} as const;

export default async function DashboardPage() {
  const [customers, leads, deals, tasks] = await Promise.all([
    listCustomers(),
    listLeads(),
    listDeals(),
    listTasks(),
  ]);

  const openPipeline = deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((sum, d) => sum + d.amount, 0);
  const openTasks = tasks.filter((t) => t.status !== "done").length;

  const kpis = [
    { label: "Khách hàng", value: customers.length },
    {
      label: "Tiềm năng đang mở",
      value: leads.filter((l) => l.status !== "lost").length,
    },
    { label: "Pipeline đang mở", value: formatUSD(openPipeline) },
    { label: "Công việc chưa xong", value: openTasks },
  ];

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Bảng điều khiển tóm tắt hoạt động kinh doanh."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className="text-2xl font-semibold">{kpi.value}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cơ hội gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cơ hội</TableHead>
                <TableHead>Công ty</TableHead>
                <TableHead>Giai đoạn</TableHead>
                <TableHead className="text-right">Giá trị</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.company}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dealStageVariant[deal.stage]}>
                      {deal.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUSD(deal.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";

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
import { formatVND, projectActuals, receivables } from "@/lib/format";
import { projectStage, projectType } from "@/lib/labels";

import { listClients } from "../clients/queries";
import { listCosts, listProjects } from "../projects/queries";
import { listQuotes } from "../quotes/queries";
import { listPaymentMilestones } from "../receivables/queries";

export default async function DashboardPage() {
  const [clients, projects, quotes, costs, milestones] = await Promise.all([
    listClients(),
    listProjects(),
    listQuotes(),
    listCosts(),
    listPaymentMilestones(),
  ]);

  const activeProjects = projects.filter(
    (p) => p.stage !== "dong" && p.stage !== "yeu_cau"
  ).length;
  const pendingQuotes = quotes.filter((q) => q.status === "da_gui").length;
  const { outstanding } = receivables(milestones);

  // Estimated gross profit = Σ(revenue) − Σ(actual costs) across all projects.
  const estimatedProfit = projects.reduce(
    (sum, p) =>
      sum +
      projectActuals(
        p,
        costs.filter((c) => c.project_code === p.code)
      ).margin,
    0
  );

  const kpis = [
    { label: "Công trình đang triển khai", value: String(activeProjects) },
    { label: "Còn phải thu", value: formatVND(outstanding) },
    { label: "Báo giá chờ duyệt", value: String(pendingQuotes) },
    { label: "Lợi nhuận ước tính", value: formatVND(estimatedProfit) },
  ];

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={`${clients.length} khách hàng · bảng điều khiển hoạt động kinh doanh.`}
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
          <CardTitle>Công trình gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên công trình</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Giai đoạn</TableHead>
                <TableHead className="text-right">Giá trị</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.code}
                    </Link>
                  </TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.client}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {projectType[project.type]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={projectStage[project.stage].variant}>
                      {projectStage[project.stage].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(project.contract_value)}
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

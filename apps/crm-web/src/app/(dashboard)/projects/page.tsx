import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Card } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { formatVND } from "@/lib/format";
import { projectStage, projectType } from "@/lib/labels";

import { ProjectFormDialog } from "./components/project-form-dialog/project-form-dialog";
import { listProjects } from "./queries";

export default async function ProjectsPage() {
  const projects = await listProjects();
  const active = projects.filter(
    (p) => p.stage !== "dong" && p.stage !== "yeu_cau"
  ).length;

  return (
    <>
      <PageHeader
        title="Công trình"
        description={`${projects.length} công trình · ${active} đang triển khai`}
        action={<ProjectFormDialog />}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên công trình</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Giai đoạn</TableHead>
              <TableHead>Tiến độ</TableHead>
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {project.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatVND(project.contract_value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

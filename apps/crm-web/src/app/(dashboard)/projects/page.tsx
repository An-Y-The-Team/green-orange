import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
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
import { formatDate } from "@/lib/format";
import { projectStage, projectStatus } from "@/lib/labels";

import { ProjectStatus } from "./enums";
import { listProjects } from "./queries";

export default async function ProjectsPage() {
  const projects = await listProjects();
  // Cancelled jobs are hidden from the default list (still reachable by URL).
  const visible = projects.filter((p) => p.status !== ProjectStatus.CANCELLED);

  return (
    <>
      <PageHeader
        title="Công trình"
        description={`${visible.length} công trình`}
        action={
          <Button render={<Link href="/projects/new" />}>
            + Tiếp nhận yêu cầu
          </Button>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên công trình</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Địa điểm</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Giai đoạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hẹn khảo sát</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((project) => (
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
                  {project.client?.name ?? `#${project.client_id}`}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.location?.name ?? `#${project.location_id}`}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {project.types.map((type) => (
                      <Badge key={type.id} variant="outline">
                        {type.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={projectStage[project.stage].variant}>
                    {projectStage[project.stage].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={projectStatus[project.status].variant}>
                    {projectStatus[project.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.appointment_at
                    ? formatDate(project.appointment_at)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

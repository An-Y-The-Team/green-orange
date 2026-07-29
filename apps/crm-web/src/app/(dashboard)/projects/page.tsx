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

import { PageHeader } from "@/components/page-header/page-header";
import { TablePager } from "@/components/table-pager/table-pager";
import { projectStage, projectStatus } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { labelOf } from "@/utils/label-of/label-of";
import { pageFromParam } from "@/utils/page-param/page-param";

import { ProjectStatus } from "./enums";
import { countProjects, listProjectsPage } from "./queries";

// Rows per page. Explicit rather than leaning on the API's default so the pager
// and the offsets it builds agree with what is actually rendered.
const PAGE_ROWS = 100;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageFromParam((await searchParams)?.page);
  // `total` counts EVERY công trình (X-Total-Count) — which is what the pager
  // must page over, since the rows below are fetched unfiltered. `cancelled` is
  // its own server-side count so the header can state the number the table
  // actually shows.
  const [{ rows, total }, cancelled] = await Promise.all([
    listProjectsPage({ limit: PAGE_ROWS, offset: (page - 1) * PAGE_ROWS }),
    countProjects(ProjectStatus.CANCELLED),
  ]);
  // Cancelled jobs are hidden from the default list (still reachable by URL).
  // ponytail: filtered after paging because GET /projects only offers `status`
  // equality, not exclusion — so a page can show fewer than PAGE_ROWS rows. A
  // server-side `status_not` (or a saved filter in the URL) removes the wobble.
  const visible = rows.filter((p) => p?.status !== ProjectStatus.CANCELLED);

  return (
    <>
      <PageHeader
        title="Công trình"
        description={`${total - cancelled} công trình`}
        action={
          <Button render={<Link href="/projects/new" />}>
            + Thêm công trình
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
            {visible.map((project) => {
              const stage = labelOf(projectStage, project.stage);
              const status = labelOf(projectStatus, project.status);
              return (
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
                    <Badge variant={stage.variant}>{stage.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.appointment_at
                      ? formatDate(project.appointment_at)
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <TablePager
        page={page}
        total={total}
        pageRows={PAGE_ROWS}
        basePath="/projects"
      />
    </>
  );
}

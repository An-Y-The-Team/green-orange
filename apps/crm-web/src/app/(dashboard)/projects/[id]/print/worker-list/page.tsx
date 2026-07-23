import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { listAssignments } from "@/app/(dashboard)/crew/queries";
import { DocumentShell } from "@/components/document-shell";
import { formatDate } from "@/lib/format";

import { getProject } from "../../../queries";

// Worker list ("Danh sách nhân sự") printed from stage-5 paperwork. Assignments
// already exist (crew listAssignments + GET /assignments?project_id=), so this is
// LIVE — no phase-5 stub needed. Rows are filtered client-side by project_id;
// crew_member/role are API includes (present live; mock omits crew_member).
export default async function WorkerListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const rows = (await listAssignments()).filter(
    (a) => a.project_id === project.id
  );

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        Quay lại công trình
      </Link>

      <DocumentShell
        title="DANH SÁCH NHÂN SỰ"
        subtitle={`${project.code} · ${project.name}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Từ ngày</TableHead>
              <TableHead>Đến ngày</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a, i) => (
              <TableRow key={a.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  {a.crew_member?.name ?? `#${a.crew_member_id}`}
                </TableCell>
                <TableCell>{a.role?.name ?? "—"}</TableCell>
                <TableCell>{formatDate(a.from_date)}</TableCell>
                <TableCell>{a.to_date ? formatDate(a.to_date) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {rows.length === 0 ? (
          <p className="mt-4 text-center text-xs text-zinc-500">
            Chưa có phân công nhân sự cho công trình này.
          </p>
        ) : null}
      </DocumentShell>
    </>
  );
}

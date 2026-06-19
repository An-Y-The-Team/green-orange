import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

import { formatVND } from "@/lib/format";
import { crewRole, crewStatus, projectStage } from "@/lib/labels";

import { listProjects } from "../../projects/queries";
import { CrewFormDialog } from "../components/crew-form-dialog/crew-form-dialog";
import { getCrewMember, listAssignments } from "../queries";

export default async function CrewDetailPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getCrewMember(Number(id));

  if (!member) {
    notFound();
  }

  // Công trình this member is staffed onto: their assignments joined to the
  // project list by project_code (same cross-reference pattern as elsewhere).
  const [assignments, projects] = await Promise.all([
    listAssignments(),
    listProjects(),
  ]);
  const myProjects = assignments
    .filter((a) => a.crew_id === member.id)
    .map((a) => ({
      assignment: a,
      project: projects.find((p) => p.code === a.project_code),
    }));

  const fields: [string, string][] = [
    ["Vai trò", crewRole[member.role]],
    ["Số điện thoại", member.phone],
    ["Ngày công", formatVND(member.day_rate)],
    ["Ngày tạo", member.created_at],
  ];

  return (
    <>
      <Link
        href="/crew"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{member.name}</CardTitle>
                <Badge variant={crewStatus[member.status].variant}>
                  {crewStatus[member.status].label}
                </Badge>
              </div>
              <CrewFormDialog member={member} />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
              {member.note && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Ghi chú</dt>
                  <dd className="text-sm">{member.note}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className={myProjects.length === 0 ? undefined : "py-0"}>
          {myProjects.length === 0 ? (
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa được phân công vào công trình nào.
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Công trình</TableHead>
                  <TableHead>Vai trò tại công trình</TableHead>
                  <TableHead>Giai đoạn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myProjects.map(({ assignment, project }) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {project ? (
                        <Link
                          href={`/projects/${project.id}`}
                          className="hover:underline"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        assignment.project_code
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assignment.role_on_site ?? crewRole[member.role]}
                    </TableCell>
                    <TableCell>
                      {project && (
                        <Badge variant={projectStage[project.stage].variant}>
                          {projectStage[project.stage].label}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

import { ArrowLeft, TriangleAlert } from "lucide-react";
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

import { formatDate } from "@/lib/format";
import {
  crewMemberStatus,
  employmentType,
  timekeepingSource,
} from "@/lib/labels";

import { getCrewMember, listTimekeeping } from "../queries";
import { MemberActions } from "./member-actions";

// Hồ sơ nhân sự — read-only (phase 1): member card, assignment history with
// the non-blocking "Trùng lịch" chip, timekeeping records.
export default async function CrewDetailPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getCrewMember(Number(id));
  if (!member) notFound();

  const records = await listTimekeeping(member.id);
  const assignments = member.assignments ?? [];

  const fields: [string, string][] = [
    ["Hình thức", employmentType[member.employment_type]],
    ["Số điện thoại / Zalo", member.phone ?? "—"],
    ["Vai trò mặc định", member.default_role?.name ?? "—"],
    ["Ngày tạo", formatDate(member.created_at)],
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{member.name}</CardTitle>
                <Badge variant={crewMemberStatus[member.status].variant}>
                  {crewMemberStatus[member.status].label}
                </Badge>
              </div>
              <MemberActions id={member.id} status={member.status} />
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

        <Card className={assignments.length === 0 ? undefined : "gap-3 py-4"}>
          {assignments.length === 0 ? (
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa được phân công vào công trình nào.
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-base">Phân công</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Công trình</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Từ ngày</TableHead>
                    <TableHead>Đến ngày</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.project ? (
                          <Link
                            href={`/projects/${a.project.id}`}
                            className="hover:underline"
                          >
                            {a.project.code}
                          </Link>
                        ) : (
                          `#${a.project_id}`
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.role?.name ?? member.default_role?.name ?? "—"}
                      </TableCell>
                      <TableCell>{formatDate(a.from_date)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.to_date ? formatDate(a.to_date) : "—"}
                      </TableCell>
                      <TableCell>
                        {(a.overlaps?.length ?? 0) > 0 && (
                          <Badge variant="warning">
                            <TriangleAlert className="size-3" />
                            Trùng lịch với{" "}
                            {a.overlaps
                              ?.map(
                                (o) => o.project?.code ?? `#${o.project_id}`
                              )
                              .join(", ")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Card>

        <Card className={records.length === 0 ? undefined : "gap-3 py-4"}>
          {records.length === 0 ? (
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu chấm công.
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-base">Chấm công</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Số giờ</TableHead>
                    <TableHead>Nguồn</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.work_date)}</TableCell>
                      <TableCell className="text-right">{r.hours}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {timekeepingSource[r.source]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.note ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

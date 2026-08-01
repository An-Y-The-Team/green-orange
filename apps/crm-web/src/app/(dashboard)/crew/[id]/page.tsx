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

import {
  CREW_MEMBER_STATUSES,
  EMPLOYMENT_TYPES,
  TIMEKEEPING_SOURCES,
} from "@/constants/labels";
import { addDays } from "@/utils/add-days/add-days";
import { formatDate } from "@/utils/format-date/format-date";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";

import { getCrewMember, listTimekeeping } from "../queries";
import { MemberActions } from "./member-actions/member-actions";

// A dateless GET /timekeeping only answers with the last 31 days, and the whole
// history of a permanent worker is an unbounded read either way — so this view
// asks for one explicit window and says so in the card heading.
const TIMEKEEPING_WINDOW_DAYS = 90;

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

  const to = todayISO();
  const records = await listTimekeeping({
    crewMemberId: member.id,
    range: { from: addDays(to, -TIMEKEEPING_WINDOW_DAYS), to },
  });
  const assignments = member.assignments ?? [];

  const statusBadge = labelOf(CREW_MEMBER_STATUSES, member.status);
  const fields: [string, string][] = [
    [
      "Hình thức",
      EMPLOYMENT_TYPES[member.employment_type] ?? member.employment_type,
    ],
    ["Số điện thoại / Zalo", member.phone ?? "—"],
    ["Vị trí mặc định", member.default_role?.name ?? "—"],
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
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
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
                    <TableHead>Vị trí</TableHead>
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
              Chưa có dữ liệu chấm công trong {TIMEKEEPING_WINDOW_DAYS} ngày gần
              nhất.
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-base">
                  Chấm công · {TIMEKEEPING_WINDOW_DAYS} ngày gần nhất
                </CardTitle>
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
                        {TIMEKEEPING_SOURCES[r.source] ?? r.source}
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

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

import { PageHeader } from "@/components/page-header";
import { formatDate, isOverdue } from "@/lib/format";
import {
  acceptanceSubStatus,
  executionSubStatus,
  overdue,
  paperworkStatus,
  projectStage,
  projectStageOrder,
  projectStatus,
} from "@/lib/labels";

import { PaperworkStatus } from "../enums";
import { getProject, listPaperworkItems } from "../queries";

// Phase-1 read-only placeholder — the guided workspace lands in phase 2.
export default async function ProjectDetailPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(Number(id));

  if (!project) {
    notFound();
  }

  const paperwork =
    project.paperwork_items ?? (await listPaperworkItems(project.id));

  // Key facts — only rows with a value render.
  const facts: [string, string | null | undefined][] = [
    ["Khách hàng", project.client?.name ?? `#${project.client_id}`],
    ["Địa điểm", project.location?.address ?? `#${project.location_id}`],
    ["Nguồn", project.referral_source],
    ["Yêu cầu", project.request_note],
    [
      "Hẹn khảo sát",
      project.appointment_at ? formatDate(project.appointment_at) : null,
    ],
    [
      "Đã gặp khách",
      project.visit_date ? formatDate(project.visit_date) : null,
    ],
    [
      "Khách ký hợp đồng",
      project.client_signed_date
        ? formatDate(project.client_signed_date)
        : null,
    ],
    [
      "Thi công",
      project.execution_sub_status
        ? executionSubStatus[project.execution_sub_status].label
        : null,
    ],
    ["Khởi công", project.start_date ? formatDate(project.start_date) : null],
    [
      "Thời gian dự kiến",
      project.est_duration_days != null
        ? `${project.est_duration_days} ngày`
        : null,
    ],
    [
      "Thời gian thực tế",
      project.actual_duration_days != null
        ? `${project.actual_duration_days} ngày`
        : null,
    ],
    [
      "Xong hạng mục",
      project.works_done_at ? formatDate(project.works_done_at) : null,
    ],
    [
      "Nghiệm thu",
      project.acceptance_sub_status
        ? acceptanceSubStatus[project.acceptance_sub_status].label
        : null,
    ],
    [
      "Nghiệm thu đạt",
      project.acceptance_passed_date
        ? formatDate(project.acceptance_passed_date)
        : null,
    ],
    [
      "Hẹn liên hệ lại",
      project.follow_up_date ? formatDate(project.follow_up_date) : null,
    ],
    ["Lý do hủy", project.cancel_reason],
  ];
  const presentFacts = facts.filter(([, value]) => value);

  return (
    <>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <PageHeader
        title={project.name}
        description={project.code}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {project.types.map((type) => (
              <Badge key={type.id} variant="outline">
                {type.name}
              </Badge>
            ))}
            <Badge variant={projectStatus[project.status].variant}>
              {projectStatus[project.status].label}
            </Badge>
          </div>
        }
      />

      {/* 9-step lifecycle indicator — current stage highlighted. */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {projectStageOrder.map((stage) => (
          <Badge
            key={stage}
            variant={stage === project.stage ? "default" : "outline"}
            className={
              stage === project.stage ? undefined : "text-muted-foreground"
            }
          >
            {projectStage[stage].label}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chính</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              {presentFacts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {paperwork.length > 0 ? (
          <Card className="py-0 lg:self-start">
            <CardHeader className="pt-6">
              <CardTitle>Hồ sơ</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hạng mục</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hạn</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paperwork.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={paperworkStatus[item.status].variant}>
                            {paperworkStatus[item.status].label}
                          </Badge>
                          {isOverdue(
                            item.due_date,
                            item.status === PaperworkStatus.APPROVED
                          ) ? (
                            <Badge variant={overdue.variant}>
                              {overdue.label}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.due_date ? formatDate(item.due_date) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.note ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}

import { Badge } from "@yan/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { formatDate, formatVND } from "@/lib/format";
import {
  acceptanceSubStatus,
  executionSubStatus,
  projectStage,
  projectStageOrder,
  quoteStatus,
} from "@/lib/labels";

import { ProjectStage } from "../../enums";
import type { Project } from "../../types";

// Read-only <dt>/<dd> grid, mirroring the phase-1 facts card. Empty rows drop out.
function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const present = rows.filter(([, v]) => v);
  if (present.length === 0) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {present.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const LATER = "Bảng điều khiển đầy đủ sẽ có ở giai đoạn kế tiếp.";

// ponytail: one switch, one file — real per-stage panels land in phases 3–4.
function StageBody({ project }: { project: Project }) {
  switch (project.stage) {
    case ProjectStage.REQUEST:
      return (
        <Facts
          rows={[
            ["Yêu cầu", project.request_note],
            ["Nguồn", project.referral_source],
            [
              "Hẹn khảo sát",
              project.appointment_at
                ? formatDate(project.appointment_at)
                : null,
            ],
          ]}
        />
      );

    case ProjectStage.SURVEY:
      return (
        <div className="space-y-3">
          {project.survey_items && project.survey_items.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {project.survey_items.map((item, i) => (
                <li key={i}>
                  {item.name}
                  {item.quantity != null
                    ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
                    : ""}
                  {item.note ? ` (${item.note})` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <Facts rows={[["Ghi chú khảo sát", project.survey_note]]} />
          {!project.survey_items?.length && !project.survey_note ? (
            <p className="text-sm text-muted-foreground">{LATER}</p>
          ) : null}
        </div>
      );

    case ProjectStage.QUOTE: {
      const latest = [...(project.quotes ?? [])].sort(
        (a, b) => b.version - a.version
      )[0];
      if (!latest)
        return <p className="text-sm text-muted-foreground">{LATER}</p>;
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">
            {project.code} · v{latest.version}
          </span>
          <span>{formatVND(latest.total_amount)}</span>
          <Badge variant={quoteStatus[latest.status].variant}>
            {quoteStatus[latest.status].label}
          </Badge>
        </div>
      );
    }

    case ProjectStage.CONTRACT:
      return (
        <Facts
          rows={[
            [
              "Khách ký hợp đồng",
              project.client_signed_date
                ? formatDate(project.client_signed_date)
                : null,
            ],
          ]}
        />
      );

    case ProjectStage.EXECUTION:
      return (
        <Facts
          rows={[
            [
              "Trạng thái thi công",
              project.execution_sub_status
                ? executionSubStatus[project.execution_sub_status].label
                : null,
            ],
            [
              "Khởi công",
              project.start_date ? formatDate(project.start_date) : null,
            ],
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
            ["Phương án thi công", project.approaches],
          ]}
        />
      );

    case ProjectStage.ACCEPTANCE:
      return (
        <Facts
          rows={[
            [
              "Trạng thái nghiệm thu",
              project.acceptance_sub_status
                ? acceptanceSubStatus[project.acceptance_sub_status].label
                : null,
            ],
            [
              "Xong hạng mục",
              project.works_done_at ? formatDate(project.works_done_at) : null,
            ],
            [
              "Nghiệm thu đạt",
              project.acceptance_passed_date
                ? formatDate(project.acceptance_passed_date)
                : null,
            ],
          ]}
        />
      );

    // paperwork (tab: Hồ sơ), settlement (tab: Thanh toán, phase 4), closed.
    default:
      return <p className="text-sm text-muted-foreground">{LATER}</p>;
  }
}

export function StagePanel({ project }: { project: Project }) {
  const n = projectStageOrder.indexOf(project.stage) + 1;
  return (
    <Card id={`stage-${project.stage}`} className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn {n} · {projectStage[project.stage].label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StageBody project={project} />
      </CardContent>
    </Card>
  );
}

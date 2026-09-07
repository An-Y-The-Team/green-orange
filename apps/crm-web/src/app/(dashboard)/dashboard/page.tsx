import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { PageHeader } from "@/components/page-header/page-header";
import { OVERDUE_LABEL } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { formatTime } from "@/utils/format-time/format-time";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { todayISO } from "@/utils/today-iso/today-iso";

import { ProjectStage, ProjectStatus } from "../projects/enums";
import {
  getProjectsSummary,
  listAllPaperworkItems,
  listProjects,
} from "../projects/queries";
import type { Project } from "../projects/types";
import { BillStatus, MilestoneStatus } from "../receivables/enums";
import {
  getReceivablesSummary,
  listBills,
  listPaymentMilestones,
} from "../receivables/queries";
import { PipelineBlock } from "./components/pipeline-block/pipeline-block";

// Rows per panel. The TOTALS no longer come from these — see the summary read.
const PANEL_ROWS = 5;
const DEBT_FETCH_ROWS = 50;

/** Hôm nay / Cần theo dõi rows — a code, a name, and the time that matters. */
function ProjectLinkList({
  items,
  detail,
}: {
  items: Project[];
  /** What the right-hand column means for this panel. */
  detail: (project: Project) => string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Không có công trình nào.</p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((p) => (
        <li key={p?.id} className="flex items-center justify-between gap-4">
          <Link href={`/projects/${p?.id}`} className="hover:underline">
            <span className="font-medium">{p?.code}</span> · {p?.name}
          </Link>
          <span className="whitespace-nowrap text-muted-foreground tabular-nums">
            {detail(p)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// A single money-owed line (milestone or bill), already resolved to a code.
type DebtRow = {
  key: string;
  project_id: number;
  code: string;
  kind: "milestone" | "bill";
  amount: number;
  due_date?: string | null;
  overdue: boolean;
};

export default async function DashboardPage() {
  const today = todayISO();

  // Every panel is a server-side `where` now, including the two "today" ones:
  // Hôm nay and Cần theo dõi used to filter a MAX_PAGE_SIZE window in JS, so a
  // project past that window silently disappeared from both.
  const [
    todayAppointments,
    followUps,
    awaiting,
    overdueMilestones,
    bills,
    overduePaperwork,
    summary,
    pipeline,
  ] = await Promise.all([
    listProjects({
      stage: ProjectStage.REQUEST,
      appointmentDate: today,
      visited: false,
      limit: PANEL_ROWS,
    }),
    listProjects({
      status: ProjectStatus.ON_HOLD,
      followUpDue: true,
      limit: PANEL_ROWS,
    }),
    // Two reads, because `overdue` REPLACES `status` server-side: money owed is
    // "đợt chờ thanh toán" ∪ "đợt quá hạn".
    listPaymentMilestones({
      status: MilestoneStatus.AWAITING_PAYMENT,
      limit: DEBT_FETCH_ROWS,
    }),
    listPaymentMilestones({ overdue: true, limit: DEBT_FETCH_ROWS }),
    listBills({ status: BillStatus.SENT, limit: DEBT_FETCH_ROWS }),
    listAllPaperworkItems({ overdue: true, limit: PANEL_ROWS }),
    // The totals: aggregated in Postgres over every row, so the figure is the
    // same whatever page a table is on. This is what the old
    // "no Tổng công nợ" comment was waiting for.
    getReceivablesSummary(),
    getProjectsSummary(),
  ]);

  // The two đợt reads overlap on an overdue awaiting_payment row — dedupe by id.
  const milestones = [
    ...new Map(
      [...awaiting, ...overdueMilestones].map((m) => [m?.id, m])
    ).values(),
  ];

  const debtMilestones: DebtRow[] = milestones.map((m) => ({
    key: `m-${m?.id}`,
    project_id: m?.project_id,
    code: m?.project?.code ?? `#${m?.project_id}`,
    kind: "milestone",
    amount: m?.amount,
    due_date: m?.due_date,
    overdue: isOverdue(m?.due_date, false),
  }));
  const debtBills: DebtRow[] = bills.map((b) => ({
    key: `b-${b?.id}`,
    project_id: b?.project_id,
    code: b?.project?.code ?? `#${b?.project_id}`,
    kind: "bill",
    amount: b?.total_amount,
    due_date: null,
    overdue: false,
  }));
  const debts = [...debtMilestones, ...debtBills].sort(
    (a, b) => Number(b?.overdue) - Number(a?.overdue)
  );

  const { by_status: byStatus, overdue } = summary.milestones;
  const owed =
    byStatus.not_due.total +
    byStatus.awaiting_payment.total +
    summary.bills.by_status.sent.total;

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Việc cần làm hôm nay và công nợ đang chờ."
        action={
          <Button render={<Link href="/projects/new" />}>
            + Tiếp nhận yêu cầu
          </Button>
        }
      />

      <PipelineBlock stages={pipeline} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            {/* The TIME, not the date: every row is today by definition, so
                printing formatDate here told the reader what the card title
                already said and hid the one thing they needed. */}
            <ProjectLinkList
              items={[...todayAppointments].sort((a, b) =>
                (a?.appointment_at ?? "").localeCompare(b?.appointment_at ?? "")
              )}
              detail={(p) => formatTime(p?.appointment_at) || null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cần theo dõi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProjectLinkList
              items={followUps}
              detail={(p) => formatDate(p?.follow_up_date) || null}
            />
            {overduePaperwork.length > 0 ? (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Hồ sơ quá hạn
                </p>
                <ul className="space-y-2 text-sm">
                  {overduePaperwork.map((i) => (
                    <li
                      key={i?.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Link
                        href={`/projects/${i?.project_id}`}
                        className="hover:underline"
                      >
                        <span className="font-medium">
                          {i?.project?.code ?? `#${i?.project_id}`}
                        </span>{" "}
                        · {i?.name}
                      </Link>
                      <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        {i?.due_date ? formatDate(i.due_date) : null}
                        <Badge variant={OVERDUE_LABEL.variant}>
                          {OVERDUE_LABEL.label}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Công nợ</CardTitle>
          <Button
            variant="link"
            size="sm"
            render={<Link href="/receivables" />}
          >
            Xem tất cả
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* A real total at last: GET /receivables/summary aggregates in
              Postgres, so this is not a sum over one page pretending to be the
              whole debt — which is why the figure used to be omitted entirely. */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-sm text-muted-foreground">Tổng công nợ</span>
            <span className="text-xl font-semibold tabular-nums">
              {formatVND(owed)}
            </span>
            {overdue.count > 0 ? (
              <span className="text-sm text-destructive tabular-nums">
                trong đó quá hạn {formatVND(overdue.total)} ({overdue.count}{" "}
                đợt)
              </span>
            ) : null}
          </div>

          {debts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có công nợ.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {debts.slice(0, PANEL_ROWS).map((d) => (
                <li
                  key={d?.key}
                  className="flex items-center justify-between gap-4"
                >
                  <Link
                    href={
                      d?.kind === "bill"
                        ? "/receivables?status=sent"
                        : "/receivables"
                    }
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className="font-medium">{d?.code}</span>
                    {/* Which table the row came from — the two used to be
                        indistinguishable in this list. */}
                    <Badge variant="outline">
                      {d?.kind === "bill" ? "Hóa đơn" : "Đợt"}
                    </Badge>
                  </Link>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-medium tabular-nums">
                      {formatVND(d?.amount)}
                    </span>
                    {d?.due_date ? (
                      <span className="text-muted-foreground tabular-nums">
                        {formatDate(d.due_date)}
                      </span>
                    ) : null}
                    {d?.overdue ? (
                      <Badge variant={OVERDUE_LABEL.variant}>
                        {OVERDUE_LABEL.label}
                      </Badge>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

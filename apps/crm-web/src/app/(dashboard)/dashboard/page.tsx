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
import { overdue } from "@/constants/labels";
import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { localDateOf, todayISO } from "@/utils/today-iso/today-iso";

import { ProjectStage, ProjectStatus } from "../projects/enums";
import { listAllPaperworkItems, listProjects } from "../projects/queries";
import type { Project } from "../projects/types";
import { BillStatus, MilestoneStatus } from "../receivables/enums";
import { listBills, listPaymentMilestones } from "../receivables/queries";

// Panels, not tables — ask the server for roughly what renders (F20).
const PANEL_ROWS = 5;
const DEBT_FETCH_ROWS = 50;

function ProjectLinkList({ items }: { items: Project[] }) {
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
          <span className="whitespace-nowrap text-muted-foreground">
            {p?.appointment_at
              ? formatDate(p.appointment_at)
              : p?.follow_up_date
                ? formatDate(p.follow_up_date)
                : null}
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
  amount: number;
  due_date?: string | null;
  overdue: boolean;
};

export default async function DashboardPage() {
  // Every filter the panels need is now a server-side `where`: the overdue
  // paperwork rule, and the two statuses the debt panel renders. Nothing here
  // fetches a whole table to throw most of it away in JS (F20).
  const [projects, milestones, bills, overduePaperwork] = await Promise.all([
    // The today/follow-up panels render projects themselves, so this list is not
    // just a code lookup. Debt rows no longer read it — they carry their own
    // `project` include (F40) — but paperwork items still have no such include,
    // so an overdue hồ sơ whose project falls outside this window prints `#id`.
    listProjects({ limit: MAX_PAGE_SIZE }),
    listPaymentMilestones({
      status: MilestoneStatus.AWAITING_PAYMENT,
      limit: DEBT_FETCH_ROWS,
    }),
    listBills({ status: BillStatus.SENT, limit: DEBT_FETCH_ROWS }),
    listAllPaperworkItems({ overdue: true, limit: PANEL_ROWS }),
  ]);

  const today = todayISO();
  // Paperwork items are the last rows without a `project` include, so they are
  // the only reason this map survives.
  const codeById = new Map(projects.map((p) => [p?.id, p?.code]));
  const codeOf = (id: number) => codeById.get(id) ?? `#${id}`;

  // Hôm nay — appointments today not yet visited. Stage 1 spans request AND
  // survey, so `!visit_date` (not the stage) is what marks "still to meet".
  const todayAppointments = projects.filter(
    (p) =>
      p?.stage === ProjectStage.REQUEST &&
      !p?.visit_date &&
      p?.appointment_at != null &&
      localDateOf(p.appointment_at) === today
  );

  // Cần theo dõi — parked jobs whose follow-up date has arrived; overdue
  // paperwork comes back already filtered from ?overdue=true.
  const followUps = projects.filter(
    (p) =>
      p?.status === ProjectStatus.ON_HOLD &&
      p?.follow_up_date &&
      p.follow_up_date <= today
  );

  // Công nợ — money owed: đợt chờ thanh toán plus sent-but-unpaid hóa đơn, both
  // server-filtered. `overdue` stays a derived read (never stored) for the badge.
  // ponytail: a not_due milestone whose due date has quietly passed no longer
  // shows here — that needs ?overdue=true on /payment-milestones, mirroring what
  // /paperwork-items got. It was already unreliable, since the old JS scan only
  // saw whichever page the unpaginated call happened to return.
  const debtMilestones: DebtRow[] = milestones.map((m) => ({
    key: `m-${m?.id}`,
    project_id: m?.project_id,
    code: m?.project?.code ?? `#${m?.project_id}`,
    amount: m?.amount,
    due_date: m?.due_date,
    overdue: isOverdue(m?.due_date, false),
  }));
  const debtBills: DebtRow[] = bills.map((b) => ({
    key: `b-${b?.id}`,
    project_id: b?.project_id,
    code: b?.project?.code ?? `#${b?.project_id}`,
    amount: b?.total_amount,
    due_date: null,
    overdue: false,
  }));
  const debts = [...debtMilestones, ...debtBills].sort(
    (a, b) => Number(b?.overdue) - Number(a?.overdue)
  );

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectLinkList items={todayAppointments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cần theo dõi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProjectLinkList items={followUps} />
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
                          {codeOf(i?.project_id)}
                        </span>{" "}
                        · {i?.name}
                      </Link>
                      <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        {i?.due_date ? formatDate(i.due_date) : null}
                        <Badge variant={overdue.variant}>{overdue.label}</Badge>
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
        <CardContent>
          {debts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có công nợ.</p>
          ) : (
            <div className="space-y-3">
              {/* No "Tổng công nợ" figure: a sum over one page understates the
                  real debt and looks authoritative doing it. Needs a server-side
                  aggregate (Σ amount by status) before it can come back. */}
              <p className="text-sm text-muted-foreground">
                Các khoản cần thu sớm nhất — xem tổng ở trang Thu & công nợ.
              </p>
              <ul className="space-y-2 text-sm">
                {debts.slice(0, PANEL_ROWS).map((d) => (
                  <li
                    key={d?.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <Link
                      href={`/projects/${d?.project_id}`}
                      className="font-medium hover:underline"
                    >
                      {d?.code}
                    </Link>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium">
                        {formatVND(d?.amount)}
                      </span>
                      {d?.due_date ? (
                        <span className="text-muted-foreground">
                          {formatDate(d.due_date)}
                        </span>
                      ) : null}
                      {d?.overdue ? (
                        <Badge variant={overdue.variant}>{overdue.label}</Badge>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { PageHeader } from "@/components/page-header";
import { formatDate, formatVND, isOverdue } from "@/lib/format";
import { overdue } from "@/lib/labels";

import {
  PaperworkStatus,
  ProjectStage,
  ProjectStatus,
} from "../projects/enums";
import { listAllPaperworkItems, listProjects } from "../projects/queries";
import type { PaperworkItem, Project } from "../projects/types";
import { listBills, listPaymentMilestones } from "../receivables/queries";

function ProjectLinkList({ items }: { items: Project[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Không có công trình nào.</p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4">
          <Link href={`/projects/${p.id}`} className="hover:underline">
            <span className="font-medium">{p.code}</span> · {p.name}
          </Link>
          <span className="whitespace-nowrap text-muted-foreground">
            {p.appointment_at
              ? formatDate(p.appointment_at)
              : p.follow_up_date
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
  const [projects, milestones, bills, paperwork] = await Promise.all([
    listProjects(),
    listPaymentMilestones(),
    listBills(),
    listAllPaperworkItems(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const codeOf = (id: number) =>
    projects.find((p) => p.id === id)?.code ?? `#${id}`;

  // Hôm nay — new requests with a survey appointment today.
  const todayAppointments = projects.filter(
    (p) =>
      p.stage === ProjectStage.REQUEST && p.appointment_at?.startsWith(today)
  );

  // Cần theo dõi — parked jobs whose follow-up date has arrived …
  const followUps = projects.filter(
    (p) =>
      p.status === ProjectStatus.ON_HOLD &&
      p.follow_up_date &&
      p.follow_up_date <= today
  );
  // … plus overdue paperwork (due date passed, not yet approved).
  const overduePaperwork: PaperworkItem[] = paperwork.filter((i) =>
    isOverdue(i.due_date, i.status === PaperworkStatus.APPROVED)
  );

  // Công nợ — money owed. Awaiting-payment or derived-overdue milestones
  // (deduped), plus sent-but-unpaid bills.
  const debtMilestones: DebtRow[] = milestones
    .filter(
      (m) =>
        m.status === "awaiting_payment" ||
        (m.status !== "paid" && isOverdue(m.due_date, false))
    )
    .map((m) => ({
      key: `m-${m.id}`,
      project_id: m.project_id,
      code: codeOf(m.project_id),
      amount: m.amount,
      due_date: m.due_date,
      overdue: isOverdue(m.due_date, false),
    }));
  const debtBills: DebtRow[] = bills
    .filter((b) => b.status === "sent")
    .map((b) => ({
      key: `b-${b.id}`,
      project_id: b.project_id,
      code: codeOf(b.project_id),
      amount: b.total_amount,
      due_date: null,
      overdue: false,
    }));
  const debts = [...debtMilestones, ...debtBills].sort(
    (a, b) => Number(b.overdue) - Number(a.overdue)
  );
  const debtTotal = debts.reduce((sum, d) => sum + d.amount, 0);

  const active = projects.filter((p) => p.status !== ProjectStatus.CANCELLED);

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={`${active.length} công trình đang theo dõi.`}
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
                      key={i.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Link
                        href={`/projects/${i.project_id}`}
                        className="hover:underline"
                      >
                        <span className="font-medium">
                          {codeOf(i.project_id)}
                        </span>{" "}
                        · {i.name}
                      </Link>
                      <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        {i.due_date ? formatDate(i.due_date) : null}
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
              <p className="text-sm text-muted-foreground">
                Tổng công nợ:{" "}
                <span className="font-semibold text-foreground">
                  {formatVND(debtTotal)}
                </span>
              </p>
              <ul className="space-y-2 text-sm">
                {debts.slice(0, 5).map((d) => (
                  <li
                    key={d.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <Link
                      href={`/projects/${d.project_id}`}
                      className="font-medium hover:underline"
                    >
                      {d.code}
                    </Link>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium">{formatVND(d.amount)}</span>
                      {d.due_date ? (
                        <span className="text-muted-foreground">
                          {formatDate(d.due_date)}
                        </span>
                      ) : null}
                      {d.overdue ? (
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

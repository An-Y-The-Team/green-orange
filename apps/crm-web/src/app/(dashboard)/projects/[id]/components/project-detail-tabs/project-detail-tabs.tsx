"use client";

import { AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";
import * as React from "react";

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
import { cn } from "@yan/ui/lib/utils";

import {
  formatDate,
  formatVND,
  projectActuals,
  receivables,
} from "@/lib/format";
import {
  acceptanceStatus,
  contractStatus,
  costCategory,
  crewRole,
  milestoneStatus,
  milestoneType,
  projectStage,
  projectType,
  quoteStatus,
  quoteType,
  scheduleOutcome,
} from "@/lib/labels";
import type {
  Acceptance,
  Assignment,
  Contract,
  Cost,
  CrewMember,
  PaymentMilestone,
  Project,
  Quote,
} from "@/types";

import { CrewAssignDialog } from "../crew-assign-dialog/crew-assign-dialog";
import { AcceptanceFormDialog } from "./components/acceptance-form-dialog/acceptance-form-dialog";
import { CostFormDialog } from "./components/cost-form-dialog/cost-form-dialog";
import { StagePipeline } from "./components/stage-pipeline/stage-pipeline";

const TABS = [
  "Tổng quan",
  "Báo giá",
  "Hợp đồng",
  "Đội thi công",
  "Chi phí & Quyết toán",
  "Nghiệm thu",
  "Thanh toán",
] as const;

export function ProjectDetailTabs({
  project,
  quotes,
  contracts,
  costs,
  acceptances,
  milestones,
  crew,
  assignments,
}: {
  project: Project;
  quotes: Quote[];
  contracts: Contract[];
  costs: Cost[];
  acceptances: Acceptance[];
  milestones: PaymentMilestone[];
  crew: CrewMember[];
  assignments: Assignment[];
}) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Tổng quan");

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Tổng quan" && (
        <OverviewTab project={project} costs={costs} milestones={milestones} />
      )}
      {tab === "Báo giá" && <QuotesTab quotes={quotes} />}
      {tab === "Hợp đồng" && <ContractsTab contracts={contracts} />}
      {tab === "Đội thi công" && (
        <CrewTab
          projectCode={project.code}
          crew={crew}
          assignments={assignments}
        />
      )}
      {tab === "Chi phí & Quyết toán" && (
        <CostsTab project={project} costs={costs} quotes={quotes} />
      )}
      {tab === "Nghiệm thu" && (
        <AcceptanceTab acceptances={acceptances} projectCode={project.code} />
      )}
      {tab === "Thanh toán" && <PaymentsTab milestones={milestones} />}
    </>
  );
}

function OverviewTab({
  project,
  costs,
  milestones,
}: {
  project: Project;
  costs: Cost[];
  milestones: PaymentMilestone[];
}) {
  const { actual_cost, margin, margin_pct } = projectActuals(project, costs);
  const { outstanding } = receivables(milestones);

  const fields: [string, React.ReactNode][] = [
    ["Mã công trình", project.code],
    ["Khách hàng", project.customer],
    ["Loại", projectType[project.type]],
    ["Phụ trách", project.manager],
    ["Địa điểm", project.address],
    [
      "Thời gian",
      `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`,
    ],
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tiến trình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StagePipeline current={project.stage} />
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Tiến độ thi công</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
          {project.schedule_outcome && (
            <Badge variant={scheduleOutcome[project.schedule_outcome].variant}>
              {scheduleOutcome[project.schedule_outcome].label}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Giá trị hợp đồng"
          value={formatVND(project.contract_value)}
        />
        <KpiCard label="Chi phí thực tế" value={formatVND(actual_cost)} />
        <KpiCard
          label="Lợi nhuận gộp"
          value={`${formatVND(margin)} (${margin_pct}%)`}
          tone={margin >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="Còn phải thu" value={formatVND(outstanding)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin chung</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-muted-foreground">Giai đoạn</dt>
              <dd className="text-sm">
                <Badge variant={projectStage[project.stage].variant}>
                  {projectStage[project.stage].label}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
        <div
          className={cn(
            "text-lg font-semibold",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-destructive"
          )}
        >
          {value}
        </div>
      </CardHeader>
    </Card>
  );
}

function QuotesTab({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) return <EmptyState text="Chưa có báo giá nào." />;
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Ngày lập</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((q) => (
            <TableRow key={q.id}>
              <TableCell className="font-medium">
                <Link href={`/quotes/${q.id}`} className="hover:underline">
                  {q.code}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {quoteType[q.type]}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(q.issue_date)}
              </TableCell>
              <TableCell>
                <Badge variant={quoteStatus[q.status].variant}>
                  {quoteStatus[q.status].label}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ContractsTab({ contracts }: { contracts: Contract[] }) {
  if (contracts.length === 0)
    return <EmptyState text="Chưa có hợp đồng cho công trình này." />;
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Ngày ký</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Giá trị</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                <Link href={`/contracts/${c.id}`} className="hover:underline">
                  {c.code}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(c.signed_date)}
              </TableCell>
              <TableCell>
                <Badge variant={contractStatus[c.status].variant}>
                  {contractStatus[c.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatVND(c.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function CostsTab({
  project,
  costs,
  quotes,
}: {
  project: Project;
  costs: Cost[];
  quotes: Quote[];
}) {
  const { actual_cost, margin, margin_pct } = projectActuals(project, costs);
  const overBudget = actual_cost > project.estimated_cost;
  const settlement = quotes.find((q) => q.type === "quyet_toan");

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <CostFormDialog projectCode={project.code} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Dự toán" value={formatVND(project.estimated_cost)} />
        <KpiCard
          label="Thực tế"
          value={formatVND(actual_cost)}
          tone={overBudget ? "negative" : undefined}
        />
        <KpiCard
          label="Doanh thu (HĐ)"
          value={formatVND(project.contract_value)}
        />
        <KpiCard
          label="Lợi nhuận gộp"
          value={`${formatVND(margin)} (${margin_pct}%)`}
          tone={margin >= 0 ? "positive" : "negative"}
        />
      </div>

      {settlement && (
        <p className="text-sm text-muted-foreground">
          Quyết toán cuối kỳ:{" "}
          <Link
            href={`/quotes/${settlement.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {settlement.code}
          </Link>
        </p>
      )}

      {costs.length === 0 ? (
        <EmptyState text="Chưa ghi nhận chi phí nào." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Hạng mục</TableHead>
                <TableHead>Diễn giải</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(cost.date)}
                  </TableCell>
                  <TableCell>{costCategory[cost.category]}</TableCell>
                  <TableCell className="flex items-center gap-1.5">
                    {cost.is_incident && (
                      <AlertTriangle className="size-3.5 text-amber-600" />
                    )}
                    {cost.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(cost.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function AcceptanceTab({
  acceptances,
  projectCode,
}: {
  acceptances: Acceptance[];
  projectCode: string;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <AcceptanceFormDialog projectCode={projectCode} />
      </div>
      {acceptances.length === 0 && (
        <EmptyState text="Chưa có biên bản nghiệm thu." />
      )}
      {acceptances.map((a) => (
        <Card key={a.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Biên bản nghiệm thu — {formatDate(a.date)}</CardTitle>
              <Badge variant={acceptanceStatus[a.status].variant}>
                {acceptanceStatus[a.status].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Người kiểm tra
                </dt>
                <dd className="text-sm">{a.inspector}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Đại diện khách hàng
                </dt>
                <dd className="text-sm">{a.client_rep}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Ghi chú</dt>
                <dd className="text-sm">{a.notes}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PaymentsTab({ milestones }: { milestones: PaymentMilestone[] }) {
  if (milestones.length === 0)
    return <EmptyState text="Chưa có lịch thanh toán." />;
  const { total_due, total_paid, outstanding } = receivables(milestones);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Tổng giá trị" value={formatVND(total_due)} />
        <KpiCard label="Đã thu" value={formatVND(total_paid)} tone="positive" />
        <KpiCard
          label="Còn nợ"
          value={formatVND(outstanding)}
          tone={outstanding > 0 ? "negative" : "positive"}
        />
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Đợt</TableHead>
              <TableHead>Hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Phải thu</TableHead>
              <TableHead className="text-right">Đã thu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((m) => {
              const locked = m.gated_by_acceptance && m.status !== "da_thu";
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      {locked && (
                        <Lock className="size-3.5 text-muted-foreground" />
                      )}
                      {m.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {milestoneType[m.type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(m.due_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={milestoneStatus[m.status].variant}>
                      {milestoneStatus[m.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(m.due_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(m.paid_amount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CrewTab({
  projectCode,
  crew,
  assignments,
}: {
  projectCode: string;
  crew: CrewMember[];
  assignments: Assignment[];
}) {
  const byId = new Map(crew.map((m) => [m.id, m]));
  const assignedIds = assignments.map((a) => a.crew_id);
  // Active crew are the candidates the assign dialog offers.
  const candidates = crew.filter((m) => m.status === "dang_lam");

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <CrewAssignDialog
          projectCode={projectCode}
          crew={candidates}
          assignedIds={assignedIds}
        />
      </div>
      {assignments.length === 0 ? (
        <EmptyState text="Chưa phân công nhân sự cho công trình này." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Vai trò tại công trình</TableHead>
                <TableHead className="text-right">Ngày công</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const member = byId.get(assignment.crew_id);
                return (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {member ? (
                        <Link
                          href={`/crew/${member.id}`}
                          className="hover:underline"
                        >
                          {member.name}
                        </Link>
                      ) : (
                        `#${assignment.crew_id}`
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member ? crewRole[member.role] : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assignment.role_on_site ??
                        (member ? crewRole[member.role] : "—")}
                    </TableCell>
                    <TableCell className="text-right">
                      {member ? formatVND(member.day_rate) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

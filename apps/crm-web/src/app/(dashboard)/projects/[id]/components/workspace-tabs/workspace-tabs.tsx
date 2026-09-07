"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "@yan/ui/components/tabs";
import { Textarea } from "@yan/ui/components/textarea";

import { EmptyState } from "@/components/empty-state/empty-state";
import {
  ACTIONS,
  BILL_STATUSES,
  FIELDS,
  LINE_ITEM_COLUMNS,
  MILESTONE_STATUSES,
  MILESTONE_TYPES,
  OVERDUE_LABEL,
  PAPERWORK_STATUSES,
  QUOTE_STATUSES,
} from "@/constants/labels";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";
import { useTabParam } from "@/hooks/use-tab-param/use-tab-param";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { labelOf } from "@/utils/label-of/label-of";

import type { Assignment, CrewMember, CrewRole } from "../../../../crew/types";
import { MilestoneStatus } from "../../../../receivables/enums";
import type { Bill, PaymentMilestone } from "../../../../receivables/types";
import { addNote } from "../../../actions/add-note";
import { PaperworkStatus } from "../../../enums";
import type { PaperworkItem, Project } from "../../../types";
import { AssignmentsTab } from "../assignments-tab/assignments-tab";

const TABS = ["quotes", "paperwork", "crew", "payment", "notes"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  quotes: "Báo giá",
  paperwork: "Hồ sơ",
  crew: FIELDS.crew,
  payment: "Thanh toán",
  notes: "Ghi chú & tệp",
};

export function WorkspaceTabs({
  project,
  paperworkItems,
  assignments,
  crew,
  roles,
  milestones,
  bills,
}: {
  project: Project;
  paperworkItems: PaperworkItem[];
  assignments: Assignment[];
  crew: CrewMember[];
  roles: CrewRole[];
  milestones: PaymentMilestone[];
  bills: Bill[];
}) {
  const [tab, setTab] = useTabParam(TABS, "quotes");

  const quotes = project.quotes ?? [];
  const notes = project.notes ?? [];
  const approved = paperworkItems.filter(
    (i) => i.status === PaperworkStatus.APPROVED
  ).length;

  // Counts in the labels, so the reader learns a tab is empty WITHOUT clicking
  // it — the only way to find out before. ALWAYS shown, including zero: an
  // absent count would be ambiguous between "empty" and "not counted", which is
  // the same guessing game in a new costume.
  const COUNTS: Record<Tab, string> = {
    quotes: ` (${quotes.length})`,
    paperwork: paperworkItems.length
      ? ` (${approved}/${paperworkItems.length})`
      : " (0)",
    crew: ` (${assignments.length})`,
    payment: ` (${milestones.length})`,
    notes: ` (${notes.length})`,
  };

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t} value={t}>
            {TAB_LABELS[t]}
            {COUNTS[t]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsPanel value="quotes">
        <QuotesTab project={project} />
      </TabsPanel>
      <TabsPanel value="paperwork">
        <PaperworkTab items={paperworkItems} projectId={project.id} />
      </TabsPanel>
      <TabsPanel value="crew">
        {tab === "crew" ? (
          <AssignmentsTab
            projectId={project.id}
            assignments={assignments}
            crew={crew}
            roles={roles}
          />
        ) : null}
      </TabsPanel>
      <TabsPanel value="payment">
        <PaymentTab
          milestones={milestones}
          bills={bills}
          projectId={project.id}
        />
      </TabsPanel>
      <TabsPanel value="notes">
        {tab === "notes" ? <NotesTab project={project} /> : null}
      </TabsPanel>
    </Tabs>
  );
}

function QuotesTab({ project }: { project: Project }) {
  const quotes = project.quotes ?? [];
  if (quotes.length === 0)
    return (
      <EmptyState
        message="Chưa có báo giá."
        action={
          <Button
            size="sm"
            render={<Link href={`/projects/${project.id}/quotes/new`} />}
          >
            Lập báo giá
          </Button>
        }
      />
    );
  return (
    <ul className="space-y-2">
      {quotes.map((q) => {
        const badge = labelOf(QUOTE_STATUSES, q.status);
        return (
          <li key={q.id}>
            {/* A link, not a dead row: this list showed a version and a total
                with no way to open or print either. */}
            <Link
              href={`/quotes/${q.id}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">
                {project.code} · v{q.version}
              </span>
              <span>{formatVND(q.total_amount)}</span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PaperworkTab({
  items,
  projectId,
}: {
  items: PaperworkItem[];
  projectId: number;
}) {
  if (items.length === 0)
    return (
      <EmptyState
        message="Chưa có hồ sơ."
        action={
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/projects/${projectId}`} />}
          >
            Thêm ở giai đoạn Chuẩn bị hồ sơ
          </Button>
        }
      />
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{LINE_ITEM_COLUMNS.item}</TableHead>
          <TableHead>{FIELDS.status}</TableHead>
          <TableHead>Hạn</TableHead>
          <TableHead>{FIELDS.note}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const badge = labelOf(PAPERWORK_STATUSES, item.status);
          return (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  {isOverdue(
                    item.due_date,
                    item.status === PaperworkStatus.APPROVED
                  ) ? (
                    <Badge variant={OVERDUE_LABEL.variant}>
                      {OVERDUE_LABEL.label}
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
          );
        })}
      </TableBody>
    </Table>
  );
}

function NotesTab({ project }: { project: Project }) {
  const notes = project.notes ?? [];
  const [body, setBody] = useState("");
  const [state, formAction] = useActionState(addNote.bind(null, project.id), {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setBody(""),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Thêm ghi chú…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={isPending || !body.trim()}
            onClick={() =>
              startTransition(() => formAction({ body: body.trim() }))
            }
          >
            {isPending ? ACTIONS.saving : "Thêm ghi chú"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        // No action here on purpose: the box that resolves it is directly above.
        <EmptyState message="Chưa có ghi chú." />
      ) : (
        <ul className="space-y-3">
          {[...notes]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((note) => (
              <li key={note.id} className="border-l-2 pl-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {formatDate(note.created_at)}
                  {note.tag ? ` · ${note.tag}` : ""}
                </div>
                <div className="whitespace-pre-wrap">{note.body}</div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Thanh toán — the đợt and hóa đơn this công trình actually has.
 *
 * This tab used to render the literal string "Sẽ có ở giai đoạn 4": an internal
 * phase marker, shipped to users, on the money tab of the money-critical
 * entity. The data was already one query away.
 */
function PaymentTab({
  milestones,
  bills,
  projectId,
}: {
  milestones: PaymentMilestone[];
  bills: Bill[];
  projectId: number;
}) {
  if (milestones.length === 0 && bills.length === 0)
    return (
      <EmptyState
        message="Chưa có đợt thanh toán hoặc hóa đơn. Đợt cọc xuất hiện khi ký hợp đồng; hóa đơn khi ký quyết toán."
        action={
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/receivables" />}
          >
            Mở Thu & công nợ
          </Button>
        }
      />
    );

  const collected = milestones
    .filter((m) => m.status === MilestoneStatus.PAID)
    .reduce((sum, m) => sum + m.amount, 0);
  const total = milestones.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="text-muted-foreground">Đã thu </span>
        <span className="font-semibold tabular-nums">
          {formatVND(collected)}
        </span>
        <span className="text-muted-foreground"> / </span>
        <span className="tabular-nums">{formatVND(total)}</span>
      </p>

      {milestones.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Đợt</TableHead>
              <TableHead className="text-right">{FIELDS.amount}</TableHead>
              <TableHead>{FIELDS.dueDate}</TableHead>
              <TableHead>{FIELDS.status}</TableHead>
              <TableHead>{FIELDS.collectDate}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((m) => {
              const badge = labelOf(MILESTONE_STATUSES, m.status);
              const late = isOverdue(
                m.due_date,
                m.status === MilestoneStatus.PAID
              );
              return (
                <TableRow key={m.id}>
                  <TableCell>{MILESTONE_TYPES[m.type] ?? m.type}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVND(m.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.due_date ? formatDate(m.due_date) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {/* Overdue sits BESIDE the status, never instead of it —
                          the same pairing plan 01 fixed on /receivables. */}
                      {late ? (
                        <Badge variant={OVERDUE_LABEL.variant}>
                          {OVERDUE_LABEL.label}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.paid_date ? formatDate(m.paid_date) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      {bills.map((bill) => {
        const badge = labelOf(BILL_STATUSES, bill.status);
        return (
          <div
            key={bill.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <span className="font-medium">Hóa đơn</span>
            <span className="tabular-nums">{formatVND(bill.total_amount)}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              render={
                <Link href={`/projects/${projectId}/print/bill/${bill.id}`} />
              }
            >
              Xem bản in
            </Button>
          </div>
        );
      })}
    </div>
  );
}

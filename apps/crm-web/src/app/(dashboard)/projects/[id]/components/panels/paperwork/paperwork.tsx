"use client";

import { Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Input } from "@yan/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { FIELDS, OVERDUE_LABEL, PAPERWORK_STATUSES } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";

import {
  createPaperworkItem,
  deletePaperworkItem,
  updatePaperworkItem,
} from "../../../../actions/paperwork";
import { GateKey, PaperworkStatus, ProjectStage } from "../../../../enums";
import type { PaperworkItem, Project } from "../../../../types";
import type { StageGate } from "../../../utils/stage-gates/stage-gates";
import { RecordDeposit } from "../../gate-actions/record-deposit/record-deposit";
import {
  type GateActions,
  GateChecklist,
} from "../../gate-checklist/gate-checklist";
import { StageCard } from "../../stage-card/stage-card";

// One-way stepper: preparing→submitted→approved. approved is terminal.
// The backend PATCH has no forward-only guard, so the map is the enforcement.
const NEXT: Partial<Record<PaperworkStatus, PaperworkStatus>> = {
  [PaperworkStatus.PREPARING]: PaperworkStatus.SUBMITTED,
  [PaperworkStatus.SUBMITTED]: PaperworkStatus.APPROVED,
};

function PaperworkRow({
  item,
  projectId,
}: {
  item: PaperworkItem;
  projectId: number;
}) {
  const [updateState, updateAction] = useActionState(
    updatePaperworkItem.bind(null, item.id, projectId),
    INITIAL_ACTION_STATE
  );
  const [deleteState, deleteAction] = useActionState(
    deletePaperworkItem.bind(null, item.id, projectId),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(updateState, isPending, {
    ...ACTION_TOAST_TITLES,
  });
  useServerAction(deleteState, isPending, {
    ...ACTION_TOAST_TITLES,
  });

  const [due, setDue] = useState(item.due_date ?? "");
  const [note, setNote] = useState(item.note ?? "");

  const next = NEXT[item.status];
  const label = labelOf(PAPERWORK_STATUSES, item.status);
  const isLate = isOverdue(
    item.due_date,
    item.status === PaperworkStatus.APPROVED
  );

  return (
    <TableRow>
      <TableCell className="font-medium">{item.name}</TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant={label.variant}>{label.label}</Badge>
          {/* One-way status advance; hidden once approved (terminal). Only the
              APPROVED hop is confirm-gated: it is terminal and it opens Thi
              công, while confirming every → Đã nộp on a 7-item checklist would
              be friction with nothing to say. */}
          {next === PaperworkStatus.APPROVED ? (
            <ConfirmAction
              trigger={
                <Button size="sm" variant="outline" disabled={isPending}>
                  → {labelOf(PAPERWORK_STATUSES, next).label}
                </Button>
              }
              title={`Duyệt "${item.name}"?`}
              consequence="Đã duyệt là trạng thái cuối — không có nút quay lại. Khi hồ sơ cần cho thi công đã duyệt hết và đã nhận cọc, công trình tự chuyển sang Thi công."
              confirmLabel="Đã duyệt"
              pending={isPending}
              onConfirm={() =>
                startTransition(() => updateAction({ status: next }))
              }
            />
          ) : next ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(() => updateAction({ status: next }))
              }
            >
              → {labelOf(PAPERWORK_STATUSES, next).label}
            </Button>
          ) : null}
        </div>
      </TableCell>

      {/* overdue drives the red chip + dashboard later. */}
      <TableCell>
        <div className="flex items-center gap-2">
          <DateInput
            value={due}
            disabled={isPending}
            className="h-8 w-auto"
            onChange={(value) => {
              setDue(value);
              startTransition(() =>
                updateAction({ due_date: value === "" ? null : value })
              );
            }}
          />
          {isLate ? (
            <Badge variant={OVERDUE_LABEL.variant}>{OVERDUE_LABEL.label}</Badge>
          ) : null}
        </div>
      </TableCell>

      {/* "đã nộp cho ai" and other free text — saved on blur. */}
      <TableCell>
        <Input
          value={note}
          disabled={isPending}
          placeholder="Đã nộp cho ai, tình trạng…"
          className="h-8"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note === (item.note ?? "")) return;
            startTransition(() => updateAction({ note }));
          }}
        />
      </TableCell>

      <TableCell className="text-right">
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={isPending}
          aria-label={`Xóa ${item.name}`}
          onClick={() => startTransition(() => deleteAction())}
        >
          <X className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddPaperworkRow({ projectId }: { projectId: number }) {
  const [state, formAction] = useActionState(
    createPaperworkItem.bind(null, projectId),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setName(""),
  });

  const submit = () => {
    if (!name.trim()) return;
    // Hạn defaults to today (local, not the server's UTC day) — nudges a real
    // deadline onto every mục instead of a blank the dashboard can't flag.
    startTransition(() =>
      formAction({ name: name.trim(), due_date: todayISO() })
    );
  };

  return (
    <TableRow>
      <TableCell colSpan={4}>
        <Input
          value={name}
          placeholder="Tên hồ sơ mới…"
          disabled={isPending}
          className="h-8"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || !name.trim()}
          onClick={submit}
        >
          <Plus className="size-4" />
          Thêm mục
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function PaperworkPanel({
  project,
  paperworkItems,
  milestones,
  dealQuote,
  gates,
}: {
  project: Project;
  paperworkItems: PaperworkItem[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
  gates: StageGate[];
}) {
  const total = paperworkItems.length;
  const approved = paperworkItems.filter(
    (i) => i.status === PaperworkStatus.APPROVED
  ).length;
  const depositPaid = milestones.some(
    (m) => m.type === MilestoneType.DEPOSIT && m.status === MilestoneStatus.PAID
  );

  // Gate = task. The hồ sơ row has no single button — the table below is that
  // work — but a missing cọc is asked for again here, with its own button.
  const actions: GateActions = {
    [GateKey.DEPOSIT]: depositPaid
      ? undefined
      : (primary) => (
          <RecordDeposit
            project={project}
            dealQuote={dealQuote}
            primary={primary}
          />
        ),
  };

  return (
    <StageCard
      stage={ProjectStage.PAPERWORK}
      aside={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {approved}/{total} đã duyệt
          </span>
          {/* Worker list "Danh sách nhân sự" — printable from assignments. */}
          <Button
            size="sm"
            variant="outline"
            render={
              <Link href={`/projects/${project.id}/print/worker-list`}>
                <Users className="size-4" />
                Tạo từ phân công
              </Link>
            }
          />
        </div>
      }
    >
      <div className="space-y-4">
        {project.stage === ProjectStage.CONTRACT ? (
          // Opened from the nav while the job is still at Hợp đồng: hồ sơ is
          // prepared in parallel (crm-business-flow.md §3).
          <p className="text-sm text-muted-foreground">
            Đang làm song song với Hợp đồng. Hồ sơ cần cho thi công duyệt xong
            và đã nhận cọc thì công trình tự chuyển sang Thi công.
          </p>
        ) : null}

        <GateChecklist
          stage={ProjectStage.PAPERWORK}
          gates={gates}
          actions={actions}
        />

        {total === 0 ? (
          // The server's auto-advance wants at least one hồ sơ needed for Thi
          // công (common/stage.ts paperworkReady), so an empty checklist never
          // moves the job by itself — say how to move on.
          <p className="mb-3 text-sm text-muted-foreground">
            Chưa có mục hồ sơ nào. Không cần hồ sơ thì chuyển giai đoạn thủ công
            ở đầu trang.
          </p>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hồ sơ</TableHead>
              <TableHead>{FIELDS.status}</TableHead>
              <TableHead>Hạn</TableHead>
              <TableHead>{FIELDS.note}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paperworkItems.map((item) => (
              <PaperworkRow key={item.id} item={item} projectId={project.id} />
            ))}
            <AddPaperworkRow projectId={project.id} />
          </TableBody>
        </Table>
      </div>
    </StageCard>
  );
}

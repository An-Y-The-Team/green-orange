"use client";

import { Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
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

import { OVERDUE_LABEL, PAPERWORK_STATUSES } from "@/constants/labels";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";
import { isOverdue } from "@/utils/is-overdue/is-overdue";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";

import {
  createPaperworkItem,
  deletePaperworkItem,
  updatePaperworkItem,
} from "../../../../actions/paperwork";
import { PaperworkStatus } from "../../../../enums";
import type { PaperworkItem, Project } from "../../../../types";

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
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
  });
  useServerAction(deleteState, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
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
          {/* One-way single-tap status advance; hidden once approved (terminal). */}
          {next ? (
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
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
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
}: {
  project: Project;
  paperworkItems: PaperworkItem[];
}) {
  const total = paperworkItems.length;
  const approved = paperworkItems.filter(
    (i) => i.status === PaperworkStatus.APPROVED
  ).length;

  return (
    <Card id={`stage-${project.stage}`} className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm uppercase tracking-wide text-muted-foreground">
          <span>
            Hồ sơ ({approved}/{total} đã duyệt)
          </span>
          {/* Worker list "Danh sách nhân sự" — printable from assignments. */}
          <Button
            size="sm"
            variant="ghost"
            render={
              <Link href={`/projects/${project.id}/print/worker-list`}>
                <Users className="size-4" />
                Tạo từ phân công
              </Link>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          // Vacuous gate — nothing to approve, execution isn't blocked on paperwork.
          <p className="mb-3 text-sm text-muted-foreground">Không cần hồ sơ</p>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hồ sơ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn</TableHead>
              <TableHead>Ghi chú</TableHead>
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
      </CardContent>
    </Card>
  );
}

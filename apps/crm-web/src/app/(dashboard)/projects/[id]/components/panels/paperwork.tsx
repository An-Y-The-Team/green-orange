"use client";

import { ChevronDown, Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import { Textarea } from "@yan/ui/components/textarea";

import { isOverdue } from "@/lib/format";
import { overdue, paperworkStatus } from "@/lib/labels";

import {
  createPaperworkItem,
  deletePaperworkItem,
  updatePaperworkItem,
} from "../../../actions/paperwork";
import { PaperworkStatus } from "../../../enums";
import type { PaperworkItem, Project } from "../../../types";

const emptyState = { success: false } as ServerActionState;

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
    emptyState
  );
  const [deleteState, deleteAction] = useActionState(
    deletePaperworkItem.bind(null, item.id, projectId),
    emptyState
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
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.note ?? "");

  const next = NEXT[item.status];
  const label = paperworkStatus[item.status];
  const isLate = isOverdue(
    item.due_date,
    item.status === PaperworkStatus.APPROVED
  );

  return (
    <li className="rounded-lg border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.name}
        </span>

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
            → {paperworkStatus[next].label}
          </Button>
        ) : null}

        {/* Native date input; overdue drives the red chip + dashboard later. */}
        <Input
          type="date"
          value={due}
          disabled={isPending}
          className="h-8 w-auto"
          onChange={(e) => {
            const value = e.target.value;
            setDue(value);
            startTransition(() =>
              updateAction({ due_date: value === "" ? null : value })
            );
          }}
        />
        {isLate ? (
          <Badge variant={overdue.variant}>{overdue.label}</Badge>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className="size-4" />
          Ghi chú
        </Button>

        <Button
          size="icon-sm"
          variant="ghost"
          disabled={isPending}
          aria-label={`Xóa ${item.name}`}
          onClick={() => startTransition(() => deleteAction())}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Expandable note — "đã nộp cho ai" and other free text live here. */}
      {expanded ? (
        <div className="mt-2 flex items-start gap-2">
          <Textarea
            rows={2}
            value={note}
            placeholder="Ghi chú (đã nộp cho ai, tình trạng…)"
            className="flex-1"
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => updateAction({ note }))}
          >
            Lưu
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function AddPaperworkRow({ projectId }: { projectId: number }) {
  const [state, formAction] = useActionState(
    createPaperworkItem.bind(null, projectId),
    emptyState
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
    startTransition(() => formAction({ name: name.trim() }));
  };

  return (
    <li className="flex items-center gap-2">
      <Input
        value={name}
        placeholder="Tên hồ sơ mới…"
        disabled={isPending}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={isPending || !name.trim()}
        onClick={submit}
      >
        <Plus className="size-4" />
        Thêm mục
      </Button>
    </li>
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

        <ul className="space-y-2">
          {paperworkItems.map((item) => (
            <PaperworkRow key={item.id} item={item} projectId={project.id} />
          ))}
          <AddPaperworkRow projectId={project.id} />
        </ul>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { selectClass } from "@/components/form-bits";
import { formatDate } from "@/lib/format";

import {
  createAssignment,
  deleteAssignment,
  updateAssignment,
} from "../../../crew/actions/assignments";
import type { Assignment, CrewMember, CrewRole } from "../../../crew/types";

type Fields = {
  crew_member_id: string;
  role_id: string;
  from_date: string;
  to_date: string;
};

const EMPTY: Fields = {
  crew_member_id: "",
  role_id: "",
  from_date: "",
  to_date: "",
};

export function AssignmentsTab({
  projectId,
  assignments,
  crew,
  roles,
}: {
  projectId: number;
  assignments: Assignment[];
  crew: CrewMember[];
  roles: CrewRole[];
}) {
  // Overlaps only arrive on create/update responses (never on the list GET),
  // so we hold them here keyed by assignment id. Seed from any overlaps the
  // list happens to carry (mock mode does).
  const [overlapsById, setOverlapsById] = useState<
    Record<number, Assignment[]>
  >(() =>
    Object.fromEntries(
      assignments
        .filter((a) => a.overlaps?.length)
        .map((a) => [a.id, a.overlaps as Assignment[]])
    )
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0); // bump to reset the add form

  const onSaved = (data: unknown) => {
    const a = data as Assignment;
    setOverlapsById((prev) => ({ ...prev, [a.id]: a.overlaps ?? [] }));
    setEditingId(null);
    setFormKey((k) => k + 1);
  };

  const editing = assignments.find((a) => a.id === editingId);

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có phân công.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                overlaps={overlapsById[a.id]}
                projectId={projectId}
                onEdit={() => setEditingId(a.id)}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-2 text-sm font-medium">
          {editing ? "Sửa phân công" : "Thêm phân công"}
        </p>
        <AssignmentForm
          key={editingId ?? `new-${formKey}`}
          projectId={projectId}
          assignmentId={editing?.id}
          crew={crew}
          roles={roles}
          initial={
            editing
              ? {
                  crew_member_id: String(editing.crew_member_id),
                  role_id: editing.role_id ? String(editing.role_id) : "",
                  from_date: editing.from_date,
                  to_date: editing.to_date ?? "",
                }
              : EMPTY
          }
          onSaved={onSaved}
          onCancel={editing ? () => setEditingId(null) : undefined}
        />
      </div>
    </div>
  );
}

function crewName(a: Assignment, crewMemberId: number, crew?: CrewMember[]) {
  return (
    a.crew_member?.name ??
    crew?.find((c) => c.id === crewMemberId)?.name ??
    `#${crewMemberId}`
  );
}

function AssignmentRow({
  assignment: a,
  overlaps,
  projectId,
  onEdit,
}: {
  assignment: Assignment;
  overlaps?: Assignment[];
  projectId: number;
  onEdit: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [state, formAction] = useActionState(
    deleteAssignment.bind(null, a.id, projectId),
    { success: false } as ServerActionState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => setConfirm(false),
  });

  const roleName = a.role?.name ?? a.crew_member?.default_role?.name;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {crewName(a, a.crew_member_id)}
      </TableCell>
      <TableCell className="text-muted-foreground">{roleName ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {formatDate(a.from_date)} →{" "}
            {a.to_date ? formatDate(a.to_date) : "…"}
          </span>
          {overlaps?.map((o) => (
            <Badge key={o.id} variant="warning">
              Trùng lịch với {o.project?.code ?? `#${o.project_id}`}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Sửa
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
            Xóa
          </Button>
        </div>
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xóa phân công?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Xóa phân công của {crewName(a, a.crew_member_id)}?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => startTransition(() => formAction())}
              >
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

function AssignmentForm({
  projectId,
  assignmentId,
  crew,
  roles,
  initial,
  onSaved,
  onCancel,
}: {
  projectId: number;
  assignmentId?: number;
  crew: CrewMember[];
  roles: CrewRole[];
  initial: Fields;
  onSaved: (data: unknown) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<Fields>(initial);
  const action = assignmentId
    ? updateAssignment.bind(null, assignmentId, projectId)
    : createAssignment.bind(null, projectId);
  const [state, formAction] = useActionState(action, {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: onSaved,
  });

  const submit = () =>
    startTransition(() =>
      formAction({
        crew_member_id: Number(f.crew_member_id),
        role_id: f.role_id ? Number(f.role_id) : undefined,
        from_date: f.from_date,
        to_date: f.to_date || undefined,
      })
    );

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Nhân viên
        <select
          className={selectClass}
          value={f.crew_member_id}
          onChange={(e) => setF({ ...f, crew_member_id: e.target.value })}
        >
          <option value="">— Chọn —</option>
          {crew.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Vai trò
        <select
          className={selectClass}
          value={f.role_id}
          onChange={(e) => setF({ ...f, role_id: e.target.value })}
        >
          <option value="">— Mặc định —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Từ ngày
        <Input
          type="date"
          className="w-auto"
          value={f.from_date}
          onChange={(e) => setF({ ...f, from_date: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Đến ngày
        <Input
          type="date"
          className="w-auto"
          value={f.to_date}
          onChange={(e) => setF({ ...f, to_date: e.target.value })}
        />
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending || !f.crew_member_id || !f.from_date}
          onClick={submit}
        >
          {isPending ? "Đang lưu…" : assignmentId ? "Lưu" : "Thêm"}
        </Button>
        {onCancel ? (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Hủy
          </Button>
        ) : null}
      </div>
    </div>
  );
}

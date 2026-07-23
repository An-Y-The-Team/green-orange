"use client";

import { CircleCheckBig, Plus, Users } from "lucide-react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";
import { Textarea } from "@yan/ui/components/textarea";

import type {
  Assignment,
  TimekeepingRecord,
} from "@/app/(dashboard)/crew/types";
import { formatDate } from "@/lib/format";
import {
  executionSubStatus,
  overdue,
  projectStage,
  timekeepingSource,
} from "@/lib/labels";

import { addNote } from "../../../actions/add-note";
import { addAttachment } from "../../../actions/attachments";
import { updateProject } from "../../../actions/update-project";
import {
  AcceptanceSubStatus,
  ExecutionSubStatus,
  ProjectStage,
} from "../../../enums";
import type { Project } from "../../../types";

const emptyState = { success: false } as ServerActionState;
const toastOpts = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };
const TODAY = () => new Date().toISOString().slice(0, 10);

// Forward-only, hoarding skippable. Order drives the stepper dots.
const STEPS = [
  ExecutionSubStatus.KICKOFF,
  ExecutionSubStatus.HOARDING,
  ExecutionSubStatus.WORKS,
] as const;

/** YYYY-MM-DD + n days → YYYY-MM-DD. */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Sub-status advance: one tap, optional note. Backend rejects backward moves.
function StatusStepper({ project }: { project: Project }) {
  const current = project.execution_sub_status ?? ExecutionSubStatus.KICKOFF;
  const currentIndex = STEPS.indexOf(current);

  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    emptyState
  );
  const [noteState, noteAction] = useActionState(
    addNote.bind(null, project.id),
    emptyState
  );
  const [isPending, startTransition] = useTransition();
  const [, startNote] = useTransition();

  const [pending, setPending] = useState<ExecutionSubStatus | null>(null);
  const [note, setNote] = useState("");

  useServerAction(state, isPending, {
    ...toastOpts,
    onSuccess: () => {
      // Optional note carries the sub-status as its tag (timeline in Ghi chú).
      if (pending && note.trim()) {
        const tag = pending;
        startNote(() => noteAction({ body: note.trim(), tag }));
      }
      setPending(null);
      setNote("");
    },
  });
  useServerAction(noteState, false, { ...toastOpts, silent: true });

  // At kickoff both "→ Dựng rào" and "→ Thi công" are offered (skip allowed).
  const nextTargets = STEPS.filter((_, i) => i > currentIndex);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => {
          const reached = i <= currentIndex;
          return (
            <span key={step} className="flex items-center gap-2">
              {i > 0 ? <span className="text-muted-foreground">──</span> : null}
              <Badge
                variant={
                  reached ? executionSubStatus[step].variant : "secondary"
                }
                className={reached ? "" : "opacity-50"}
              >
                {executionSubStatus[step].label}
              </Badge>
            </span>
          );
        })}
      </div>

      {nextTargets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextTargets.map((target) => (
            <Button
              key={target}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setPending(target)}
            >
              → {executionSubStatus[target].label}
            </Button>
          ))}
        </div>
      ) : null}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Chuyển sang: {pending ? executionSubStatus[pending].label : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="step-note">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="step-note"
              rows={2}
              value={note}
              placeholder="Ghi chú cho bước này…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Đóng</Button>} />
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(() =>
                  formAction({ execution_sub_status: pending! })
                )
              }
            >
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// start_date / est / actual — one action state, patches the changed field.
// actual_duration_days is the source of truth; timekeeping is shown as-is.
function Duration({
  project,
  timekeeping,
}: {
  project: Project;
  timekeeping: TimekeepingRecord[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    emptyState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, toastOpts);

  const [start, setStart] = useState(project.start_date ?? "");
  const [est, setEst] = useState(
    project.est_duration_days != null ? String(project.est_duration_days) : ""
  );
  const [actual, setActual] = useState(
    project.actual_duration_days != null
      ? String(project.actual_duration_days)
      : ""
  );
  const [diffOpen, setDiffOpen] = useState(false);

  const estDays = Number(est);
  const estEnd = start && est !== "" ? addDays(start, estDays) : null;
  // "trễ": past estimated end and works not yet confirmed done.
  const late = estEnd ? estEnd < TODAY() && !project.works_done_at : false;

  const totalHours = timekeeping.reduce((s, t) => s + t.hours, 0);
  const recordedDays = new Set(timekeeping.map((t) => t.work_date)).size;
  // No 8h=1day conversion — compare the two day counts directly.
  const disagree =
    actual !== "" && recordedDays > 0 && Number(actual) !== recordedDays;

  const commitInt =
    (field: "est_duration_days" | "actual_duration_days") =>
    (value: string) => {
      if (value === "") return;
      const n = Math.trunc(Number(value));
      if (Number.isNaN(n)) return;
      startTransition(() => formAction({ [field]: n }));
    };

  return (
    <section className="space-y-3 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start-date">Bắt đầu</Label>
          <Input
            id="start-date"
            type="date"
            value={start}
            disabled={isPending}
            className="h-8 w-auto"
            onChange={(e) => {
              const value = e.target.value;
              setStart(value);
              if (value)
                startTransition(() => formAction({ start_date: value }));
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="est-days">Dự kiến (ngày)</Label>
          <Input
            id="est-days"
            type="number"
            min={0}
            value={est}
            disabled={isPending}
            className="h-8 w-24"
            onChange={(e) => setEst(e.target.value)}
            onBlur={(e) => commitInt("est_duration_days")(e.target.value)}
          />
        </div>
        {estEnd ? (
          <span className="flex items-center gap-2 pb-1.5 text-muted-foreground">
            → {formatDate(estEnd)}
            {late ? <Badge variant={overdue.variant}>⚠ trễ</Badge> : null}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="actual-days">Thực tế (ngày · nguồn chính)</Label>
          <Input
            id="actual-days"
            type="number"
            min={0}
            value={actual}
            disabled={isPending}
            className="h-8 w-24"
            onChange={(e) => setActual(e.target.value)}
            onBlur={(e) => commitInt("actual_duration_days")(e.target.value)}
          />
        </div>
        <span className="flex items-center gap-2 pb-1.5 text-muted-foreground">
          Chấm công: {totalHours} giờ / {recordedDays} ngày có ghi nhận
          {disagree ? (
            <>
              <Badge variant={overdue.variant}>⚠</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDiffOpen(true)}
              >
                Xem chênh lệch
              </Button>
            </>
          ) : null}
        </span>
      </div>

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấm công theo ngày</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Thực tế nhập tay: {actual || "—"} ngày · Chấm công: {recordedDays}{" "}
            ngày. Sửa ô “Thực tế” để chốt.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Nhân sự</TableHead>
                <TableHead>Giờ</TableHead>
                <TableHead>Nguồn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timekeeping.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.work_date)}</TableCell>
                  <TableCell>#{t.crew_member_id}</TableCell>
                  <TableCell>{t.hours}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {timekeepingSource[t.source]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Đóng</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// Assignment summary + approaches free text. Editing crew lives in the Nhân sự tab.
function Personnel({
  project,
  assignments,
}: {
  project: Project;
  assignments: Assignment[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    emptyState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, toastOpts);

  const [approaches, setApproaches] = useState(project.approaches ?? "");

  const workerCount = new Set(assignments.map((a) => a.crew_member_id)).size;
  // ponytail: within-project double-book only (same member twice). Precise
  // cross-project overlap is a phase-5 crew-tab feature.
  const doubleBooked = assignments.length > workerCount;

  return (
    <section className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Nhân sự ({workerCount})</span>
        {doubleBooked ? (
          <Badge variant="warning">⚠ Trùng lịch trong công trình</Badge>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          render={
            <Link href="/crew">
              <Users className="size-4" />
              tab Nhân sự
            </Link>
          }
        />
      </div>

      {assignments.length === 0 ? (
        <p className="text-muted-foreground">Chưa phân công nhân sự.</p>
      ) : (
        <ul className="space-y-1">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <span>{a.crew_member?.name ?? `#${a.crew_member_id}`}</span>
              {a.role?.name ? (
                <Badge variant="secondary">{a.role.name}</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="approaches">Cách thức thi công</Label>
        <div className="flex items-start gap-2">
          <Textarea
            id="approaches"
            rows={2}
            value={approaches}
            placeholder="dây đu, làm đêm…"
            className="flex-1"
            onChange={(e) => setApproaches(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => formAction({ approaches }))}
          >
            Lưu
          </Button>
        </div>
      </div>
    </section>
  );
}

// Exit: single patch stamps works_done_at + moves to stage 7 with request_sent
// (backend does NOT auto-set request_sent). Optional finish-image attachments.
function FinishConfirm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    emptyState
  );
  const [attState, attAction] = useActionState(
    addAttachment.bind(null, project.id),
    emptyState
  );
  const [isPending, startTransition] = useTransition();
  const [, startAtt] = useTransition();
  useServerAction(state, isPending, toastOpts);
  useServerAction(attState, false, {
    ...toastOpts,
    onSuccess: () => {
      setFilename("");
      setImgNote("");
    },
  });

  const [filename, setFilename] = useState("");
  const [imgNote, setImgNote] = useState("");

  const addImage = () => {
    if (!filename.trim()) return;
    const note = imgNote.trim();
    startAtt(() =>
      attAction({
        kind: "finish_image",
        filename: filename.trim(),
        note: note || undefined,
      })
    );
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-muted-foreground">
          Ảnh hoàn công (tùy chọn)
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={filename}
            placeholder="Tên tệp ảnh…"
            className="h-8 w-48"
            onChange={(e) => setFilename(e.target.value)}
          />
          <Input
            value={imgNote}
            placeholder="Ghi chú"
            className="h-8 w-48"
            onChange={(e) => setImgNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!filename.trim()}
            onClick={addImage}
          >
            <Plus className="size-4" />
            Thêm ảnh
          </Button>
        </div>
      </div>

      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(() =>
            formAction({
              works_done_at: new Date().toISOString(),
              stage: ProjectStage.ACCEPTANCE,
              acceptance_sub_status: AcceptanceSubStatus.REQUEST_SENT,
            })
          )
        }
      >
        <CircleCheckBig className="size-4" />
        Xác nhận hoàn tất thi công
      </Button>
    </section>
  );
}

export function ExecutionPanel({
  project,
  timekeeping,
  assignments,
}: {
  project: Project;
  timekeeping: TimekeepingRecord[];
  assignments: Assignment[];
}) {
  return (
    <Card id="stage-execution" className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn 6 · {projectStage[ProjectStage.EXECUTION].label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <StatusStepper project={project} />
        <Duration project={project} timekeeping={timekeeping} />
        <Personnel project={project} assignments={assignments} />
        <FinishConfirm project={project} />
      </CardContent>
    </Card>
  );
}

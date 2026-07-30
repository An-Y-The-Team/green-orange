"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
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

import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";
import { OVERDUE_LABEL, TIMEKEEPING_SOURCES } from "@/constants/labels";
import { MAX_PAGE_SIZE } from "@/constants/pagination";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { addDays } from "@/utils/add-days/add-days";
import { formatDate } from "@/utils/format-date/format-date";
import { todayISO } from "@/utils/today-iso/today-iso";

import { updateProject } from "../../../../../../../../actions/update-project";
import { DurationField } from "../../../../../../../../enums";
import type { Project } from "../../../../../../../../types";

/**
 * start_date / est / actual — one action state, patches the changed field.
 * `actual_duration_days` is the source of truth; timekeeping is shown as-is.
 *
 * `totalHours` / `recordedDays` are the server's exact aggregate over the whole
 * công trình (see duration.tsx), so they are stated plainly — no "≥", no
 * incomplete-data badge. `timekeeping` is ONE page of rows and feeds only the
 * per-day breakdown dialog, which says so when it is cut off.
 */
export function DurationForm({
  project,
  timekeeping,
  totalHours,
  recordedDays,
}: {
  project: Project;
  timekeeping: TimekeepingRecord[];
  totalHours: number;
  recordedDays: number;
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, ACTION_TOAST_TITLES);

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
  const late = estEnd ? estEnd < todayISO() && !project.works_done_at : false;

  // No 8h=1day conversion — compare the two day counts directly. Both sides are
  // now exact, so a difference is always a real one worth flagging.
  const disagree =
    actual !== "" && recordedDays > 0 && Number(actual) !== recordedDays;
  // The dialog lists rows, and rows still arrive one page at a time.
  const listCutOff = timekeeping.length >= MAX_PAGE_SIZE;

  // Commits an integer duration on blur; ignores blank/NaN so a cleared field
  // doesn't patch the row to 0.
  const commitInt = (field: DurationField) => (value: string) => {
    if (value === "") return;
    const n = Math.trunc(Number(value));
    if (Number.isNaN(n)) return;
    startTransition(() => formAction({ [field]: n }));
  };

  // Start date — mirrors it locally and patches immediately. Clearing the field
  // only empties the input; no patch is sent (same guard as commitInt).
  const handleStartDateChange = (value: string) => {
    setStart(value);
    if (value) startTransition(() => formAction({ start_date: value }));
  };

  return (
    <section className="space-y-3 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start-date">Bắt đầu</Label>
          <DateInput
            id="start-date"
            value={start}
            disabled={isPending}
            className="h-8 w-auto"
            onChange={handleStartDateChange}
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
            onBlur={(e) => commitInt(DurationField.ESTIMATED)(e.target.value)}
          />
        </div>
        {estEnd ? (
          <span className="flex items-center gap-2 pb-1.5 text-muted-foreground">
            → {formatDate(estEnd)}
            {late ? <Badge variant={OVERDUE_LABEL.variant}>⚠ trễ</Badge> : null}
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
            onBlur={(e) => commitInt(DurationField.ACTUAL)(e.target.value)}
          />
        </div>
        <span className="flex items-center gap-2 pb-1.5 text-muted-foreground">
          Chấm công (toàn công trình): {totalHours} giờ / {recordedDays} ngày có
          ghi nhận
          {disagree ? (
            <>
              <Badge variant={OVERDUE_LABEL.variant}>⚠</Badge>
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
            {listCutOff
              ? ` Bảng dưới chỉ hiển thị ${MAX_PAGE_SIZE} dòng gần nhất.`
              : ""}
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
                      {TIMEKEEPING_SOURCES[t.source] ?? t.source}
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

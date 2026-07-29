"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import type { Project } from "@/app/(dashboard)/projects/types";
import { selectClass } from "@/components/form-bits/form-bits";
import { timekeepingSource } from "@/constants/labels";
import { addDays } from "@/utils/add-days/add-days";
import { mondayOfThisWeek, weekRange } from "@/utils/date-range/date-range";
import { formatDate } from "@/utils/format-date/format-date";

import {
  loadProjectTimekeeping,
  upsertTimekeeping,
} from "../../actions/timekeeping";
import { CrewMemberStatus, TimekeepingSource } from "../../enums";
import type { CrewMember, TimekeepingRecord } from "../../types";

const emptyState = { success: false } as ServerActionState;
const toastOpts = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function TimekeepingTab({
  crew,
  projects,
}: {
  crew: CrewMember[];
  projects: Project[];
}) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [records, setRecords] = useState<TimekeepingRecord[]>([]);
  const [weekStart, setWeekStart] = useState<string>(() => mondayOfThisWeek());

  const [isLoading, startLoad] = useTransition();
  // Fetches exactly the 7 days the grid renders — the backend's dateless default
  // is the last 31 days, so an older week only arrives if we ask for it. Every
  // change of project or week therefore reloads (no useEffect: the handlers do it).
  const reload = ({
    projectId: id,
    weekStart: start,
  }: {
    projectId: number;
    weekStart: string;
  }) =>
    startLoad(async () =>
      setRecords(
        await loadProjectTimekeeping({ projectId: id, range: weekRange(start) })
      )
    );

  const [saveState, saveAction] = useActionState(
    upsertTimekeeping.bind(null, projectId ?? 0),
    emptyState
  );
  const [isSaving, startSave] = useTransition();
  // On a successful save, re-read the grid so totals/ids reflect the backend.
  useServerAction(saveState, isSaving, {
    ...toastOpts,
    silent: true,
    onSuccess: () => {
      if (projectId) reload({ projectId, weekStart });
    },
  });

  const pickProject = (id: number) => {
    setProjectId(id || null);
    setRecords([]);
    if (id) reload({ projectId: id, weekStart });
  };

  // Week navigation is a refetch, not just a re-render: the new week's rows are
  // outside the window we already hold.
  const shiftWeek = (weeks: number) => () => {
    const next = addDays(weekStart, weeks * 7);
    setWeekStart(next);
    setRecords([]);
    if (projectId) reload({ projectId, weekStart: next });
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Rows = currently-working members (day-hires included). Left members hidden.
  const rows = crew.filter((m) => m.status === CrewMemberStatus.WORKING);

  // Cell lookup: manual is editable + source of truth; a lone zalo_app row is
  // shown read-only. ponytail: manual wins when both exist for a member+day —
  // the grid never touches zalo rows.
  const cellFor = (memberId: number, date: string) => {
    const cell = records.filter(
      (r) => r.crew_member_id === memberId && r.work_date === date
    );
    const manual = cell.find((r) => r.source === TimekeepingSource.MANUAL);
    const zalo = cell.find((r) => r.source === TimekeepingSource.ZALO_APP);
    return { manual, zalo };
  };
  const hoursFor = (memberId: number, date: string) => {
    const { manual, zalo } = cellFor(memberId, date);
    return manual?.hours ?? zalo?.hours ?? 0;
  };

  const commit =
    (memberId: number, date: string) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      if (raw === "") return; // blank = no edit (deletion is a separate path)
      const hours = Number(raw);
      if (Number.isNaN(hours) || hours < 0) return;
      const { manual } = cellFor(memberId, date);
      if (manual && manual.hours === hours) return; // unchanged
      startSave(() =>
        saveAction({ crew_member_id: memberId, work_date: date, hours })
      );
    };

  const dayTotal = (date: string) =>
    rows.reduce((s, m) => s + hoursFor(m.id, date), 0);
  const rowTotal = (memberId: number) =>
    days.reduce((s, d) => s + hoursFor(memberId, d), 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Chấm công theo tuần</CardTitle>
        <select
          className={`${selectClass} sm:w-72`}
          value={projectId ?? ""}
          onChange={(e) => pickProject(Number(e.target.value))}
        >
          <option value="">— Chọn công trình —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
      </CardHeader>

      <CardContent className="space-y-4">
        {projectId === null ? (
          <p className="text-sm text-muted-foreground">
            Chọn một công trình để chấm công.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={shiftWeek(-1)}>
                <ChevronLeft className="size-4" />
                Tuần trước
              </Button>
              <span className="text-sm text-muted-foreground">
                {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
              </span>
              <Button size="sm" variant="outline" onClick={shiftWeek(1)}>
                Tuần sau
                <ChevronRight className="size-4" />
              </Button>
              {isLoading || isSaving ? (
                <span className="text-xs text-muted-foreground">Đang tải…</span>
              ) : null}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Nhân sự</TableHead>
                  {days.map((d, i) => (
                    <TableHead key={d} className="text-center">
                      {WEEKDAYS[i]}
                      <div className="text-xs font-normal text-muted-foreground">
                        {formatDate(d).slice(0, 5)}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={days.length + 2}
                      className="text-center text-muted-foreground"
                    >
                      Không có nhân sự đang làm.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      {days.map((d) => {
                        const { manual, zalo } = cellFor(m.id, d);
                        const readOnly = zalo && !manual;
                        return (
                          <TableCell key={d} className="p-1 text-center">
                            {readOnly ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm">{zalo.hours}</span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {timekeepingSource[zalo.source] ??
                                    zalo.source}
                                </Badge>
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                // key pins the initial value to the loaded record;
                                // remounts on project / week / record change.
                                key={`${projectId}-${m.id}-${d}-${manual?.id ?? "new"}`}
                                defaultValue={manual ? manual.hours : ""}
                                disabled={isSaving}
                                className="h-8 w-14 text-center"
                                onBlur={commit(m.id, d)}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-medium">
                        {rowTotal(m.id)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {rows.length > 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Tổng ngày</TableCell>
                    {days.map((d) => (
                      <TableCell key={d} className="text-center font-medium">
                        {dayTotal(d)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-medium">
                      {days.reduce((s, d) => s + dayTotal(d), 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : null}
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

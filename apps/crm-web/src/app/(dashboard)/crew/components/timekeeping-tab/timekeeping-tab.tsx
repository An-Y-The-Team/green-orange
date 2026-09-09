"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Skeleton } from "@yan/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { EmptyState } from "@/components/empty-state/empty-state";
import { EntityCombobox } from "@/components/entity-combobox/entity-combobox";
import { FIELDS } from "@/constants/labels";
import { addDays } from "@/utils/add-days/add-days";
import { mondayOfThisWeek, weekRange } from "@/utils/date-range/date-range";
import { formatDate } from "@/utils/format-date/format-date";

import {
  loadProjectAssignments,
  loadProjectTimekeeping,
} from "../../actions/timekeeping";
import { CrewMemberStatus, TimekeepingSource } from "../../enums";
import type { CrewMember, TimekeepingRecord } from "../../types";
import { TimekeepingCell } from "./components/timekeeping-cell/timekeeping-cell";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function TimekeepingTab({ crew }: { crew: CrewMember[] }) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const [records, setRecords] = useState<TimekeepingRecord[]>([]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [weekStart, setWeekStart] = useState<string>(() => mondayOfThisWeek());
  // Which (project, week) the rows in `records` actually belong to. The cells
  // read their opening value ONCE at mount, so they must not be mounted before
  // their week has arrived — otherwise every input renders blank over correct
  // totals, which is exactly what happened the first time this was built.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const [isLoading, startLoad] = useTransition();
  // Fetches exactly the 7 days the grid renders — the backend's dateless default
  // is the last 31 days, so an older week only arrives if we ask for it. Every
  // change of project or week therefore reloads (no useEffect: the handlers do
  // it). A cell SAVE no longer reloads: the cell owns its own value and hands the
  // saved row back, so the week is only refetched when the window itself moves.
  const reload = ({
    projectId: id,
    weekStart: start,
    withAssignments,
  }: {
    projectId: number;
    weekStart: string;
    withAssignments?: boolean;
  }) =>
    startLoad(async () => {
      const [rows, assignments] = await Promise.all([
        loadProjectTimekeeping({ projectId: id, range: weekRange(start) }),
        withAssignments ? loadProjectAssignments(id) : Promise.resolve(null),
      ]);
      setRecords(rows);
      if (assignments)
        setAssignedIds([...new Set(assignments.map((a) => a.crew_member_id))]);
      setLoadedKey(`${id}-${start}`);
    });

  const pickProject = (id: number) => {
    setProjectId(id || null);
    setRecords([]);
    setAssignedIds([]);
    setShowAll(false);
    setLoadedKey(null);
    if (id) reload({ projectId: id, weekStart, withAssignments: true });
  };

  // Week navigation is a refetch, not just a re-render: the new week's rows are
  // outside the window we already hold. Assignments don't change with the week.
  const goToWeek = (start: string) => {
    setWeekStart(start);
    setRecords([]);
    setLoadedKey(null);
    if (projectId) reload({ projectId, weekStart: start });
  };
  const shiftWeek = (weeks: number) => () =>
    goToWeek(addDays(weekStart, weeks * 7));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const ready = loadedKey !== null && loadedKey === `${projectId}-${weekStart}`;

  // Rows = the people phân công'd to THIS công trình. Falling back to the whole
  // working roster only when nothing is assigned, because entering four people's
  // hours by scrolling forty rows was the complaint.
  const working = crew.filter((m) => m.status === CrewMemberStatus.WORKING);
  const assigned = crew.filter((m) => assignedIds.includes(m.id));
  const noAssignments = assigned.length === 0;
  const rows = showAll || noAssignments ? working : assigned;

  // The cell that owns a member+day hands its saved row back here, so the
  // totals stay live without a refetch.
  const mergeRecord = (record: TimekeepingRecord) =>
    setRecords((prev) => [
      ...prev.filter(
        (r) =>
          !(
            r.crew_member_id === record.crew_member_id &&
            r.work_date === record.work_date &&
            r.source === record.source
          )
      ),
      record,
    ]);
  const dropRecord = (id: number) =>
    setRecords((prev) => prev.filter((r) => r.id !== id));

  // Manual wins over a zalo_app row for the same member+day — it never sums,
  // matching the backend's timekeepingSummary.
  const cellFor = (memberId: number, date: string) => {
    const cell = records.filter(
      (r) => r.crew_member_id === memberId && r.work_date === date
    );
    return {
      manual: cell.find((r) => r.source === TimekeepingSource.MANUAL),
      zalo: cell.find((r) => r.source === TimekeepingSource.ZALO_APP),
    };
  };
  const hoursFor = (memberId: number, date: string) => {
    const { manual, zalo } = cellFor(memberId, date);
    return manual?.hours ?? zalo?.hours ?? 0;
  };

  const dayTotal = (date: string) =>
    rows.reduce((sum, m) => sum + hoursFor(m.id, date), 0);
  const rowTotal = (memberId: number) =>
    days.reduce((sum, d) => sum + hoursFor(memberId, d), 0);
  const weekTotal = days.reduce((sum, d) => sum + dayTotal(d), 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Chấm công theo tuần</CardTitle>
        {/* Searchable, not a one-page <select>: a công trình past the server's
            first page could not be chosen at all. */}
        <EntityCombobox
          resource="projects"
          id="timekeeping-project"
          className="sm:w-72"
          value={projectId}
          onChange={(id) => pickProject(id ?? 0)}
          placeholder="Tìm công trình theo mã, tên…"
        />
      </CardHeader>

      <CardContent className="space-y-4">
        {projectId === null ? (
          <p className="text-sm text-muted-foreground">
            Chọn một công trình để chấm công.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={shiftWeek(-1)}>
                <ChevronLeft className="size-4" />
                Tuần trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={weekStart === mondayOfThisWeek()}
                onClick={() => goToWeek(mondayOfThisWeek())}
              >
                Tuần này
              </Button>
              <Button size="sm" variant="outline" onClick={shiftWeek(1)}>
                Tuần sau
                <ChevronRight className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
              </span>
              {isLoading ? (
                <span className="text-xs text-muted-foreground">Đang tải…</span>
              ) : null}
              {!noAssignments ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll
                    ? `Chỉ nhân sự của công trình (${assigned.length})`
                    : `+ Thêm người ngoài phân công (${working.length})`}
                </Button>
              ) : null}
            </div>

            {noAssignments && rows.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Công trình chưa phân công ai — đang hiện toàn bộ nhân sự đang
                làm.
              </p>
            ) : null}

            {!ready ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40">{FIELDS.crew}</TableHead>
                    {days.map((d, i) => (
                      <TableHead key={d} scope="col" className="text-center">
                        {WEEKDAYS[i]}
                        <div className="text-xs font-normal text-muted-foreground">
                          {formatDate(d).slice(0, 5)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead scope="col" className="text-center">
                      Tổng
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={days.length + 2}>
                        <EmptyState
                          message="Không có nhân sự đang làm."
                          action={
                            <Button
                              size="sm"
                              variant="outline"
                              render={<Link href="/crew/new" />}
                            >
                              + Thêm nhân sự
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        {days.map((d, i) => {
                          const { manual, zalo } = cellFor(m.id, d);
                          return (
                            <TimekeepingCell
                              // Keyed on the WINDOW, not the record: a save must
                              // not remount the cell the user just left.
                              key={`${projectId}-${weekStart}-${m.id}-${d}`}
                              projectId={projectId}
                              memberId={m.id}
                              memberName={m.name}
                              date={d}
                              weekday={WEEKDAYS[i] ?? ""}
                              manual={manual}
                              zalo={zalo}
                              onSaved={mergeRecord}
                              onDeleted={dropRecord}
                            />
                          );
                        })}
                        <TableCell className="text-center font-medium tabular-nums">
                          {rowTotal(m.id)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {rows.length > 0 ? (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">Tổng ngày</TableCell>
                      {days.map((d) => (
                        <TableCell
                          key={d}
                          className="text-center font-medium tabular-nums"
                        >
                          {dayTotal(d)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-medium tabular-nums">
                        {weekTotal}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

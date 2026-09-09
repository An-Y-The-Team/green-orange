"use client";

import { useActionState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { MAX_SHIFT_HOURS } from "@/app/(dashboard)/crew/constants";
import type { Project } from "@/app/(dashboard)/projects/types";
import { TIMEKEEPING_FLAGS, TIMEKEEPING_SOURCES } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";

import {
  type DecideTimekeepingValues,
  decideTimekeeping,
} from "../../actions/timekeeping";
import { TimekeepingFlag, TimekeepingStatus } from "../../enums";
import type { CrewMember, TimekeepingRecord } from "../../types";

// Chấm công từ Zalo app chờ duyệt — rendered above the weekly grid. The list
// arrives from the server (page props); a decide revalidates /crew so the card
// and the grid refresh together. Renders nothing when there is nothing to duyệt.
export function PendingApprovals({
  pending,
  crew,
  projects,
}: {
  pending: TimekeepingRecord[];
  crew: CrewMember[];
  projects: Project[];
}) {
  const [state, action] = useActionState(
    decideTimekeeping,
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, ACTION_TOAST_TITLES);

  if (pending.length === 0) return null;

  // The row carries its own member and project (GET /timekeeping includes both),
  // so the page's crew/projects windows are only a fallback for a row whose
  // include is missing — a pending item from outside them used to render as
  // "Nhân sự #7".
  const memberName = (record: TimekeepingRecord) =>
    record.crew_member?.name ??
    crew.find((m) => m.id === record.crew_member_id)?.name ??
    `Nhân sự #${record.crew_member_id}`;
  const projectLabel = (record: TimekeepingRecord) => {
    const project =
      record.project ?? projects.find((p) => p.id === record.project_id);
    return project
      ? `${project.code} · ${project.name}`
      : `Công trình #${record.project_id}`;
  };

  // One decide per click; the card row disappears on the revalidate that follows.
  const decide =
    (id: number, status: DecideTimekeepingValues["status"]) => () =>
      startTransition(() => action({ id, status }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle>Chấm công chờ duyệt</CardTitle>
        <Badge variant="secondary">{pending.length}</Badge>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {pending.map((record) => (
            <li
              key={record.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {memberName(record)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {projectLabel(record)}
                  </span>
                </p>
                <p className="text-muted-foreground text-sm">
                  {formatDate(record.work_date)}
                  {record.start_time && record.end_time
                    ? ` · ${record.start_time}–${record.end_time}`
                    : null}{" "}
                  · {record.hours} giờ ·{" "}
                  {TIMEKEEPING_SOURCES[record.source] ?? record.source}
                  {record.note ? ` · ${record.note}` : null}
                </p>
                {/* Both badges say in words what they mean, so neither depends
                    on its colour to be understood (WCAG 1.4.1). */}
                {record.remedy_reason || record.flag ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {record.remedy_reason ? (
                      <Badge variant="warning">Đơn bù công</Badge>
                    ) : null}
                    {record.flag ? (
                      <Badge variant="destructive">
                        {TIMEKEEPING_FLAGS[record.flag] ?? record.flag}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {/* The lý do is the whole basis for deciding a đơn bù công —
                    these times were claimed, not stamped. */}
                {record.remedy_reason ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Lý do: {record.remedy_reason}
                  </p>
                ) : null}
                {record.flag === TimekeepingFlag.OVER_CAP ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Ca vượt {MAX_SHIFT_HOURS} giờ — giờ công đã bị giới hạn ở{" "}
                    {MAX_SHIFT_HOURS}. Hỏi lại nhân sự trước khi duyệt.
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={decide(record.id, TimekeepingStatus.APPROVED)}
                >
                  Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={decide(record.id, TimekeepingStatus.REJECTED)}
                >
                  Từ chối
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

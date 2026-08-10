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

import type { Project } from "@/app/(dashboard)/projects/types";
import { TIMEKEEPING_SOURCES } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";

import {
  type DecideTimekeepingValues,
  decideTimekeeping,
} from "../../actions/timekeeping";
import { TimekeepingStatus } from "../../enums";
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

  const memberName = (id: number) =>
    crew.find((m) => m.id === id)?.name ?? `Nhân sự #${id}`;
  const projectLabel = (id: number) => {
    const project = projects.find((p) => p.id === id);
    return project ? `${project.code} · ${project.name}` : `Công trình #${id}`;
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
                  {memberName(record.crew_member_id)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {projectLabel(record.project_id)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(record.work_date)}
                  {record.start_time && record.end_time
                    ? ` · ${record.start_time}–${record.end_time}`
                    : null}{" "}
                  · {record.hours} giờ ·{" "}
                  {TIMEKEEPING_SOURCES[record.source] ?? record.source}
                  {record.note ? ` · ${record.note}` : null}
                </p>
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

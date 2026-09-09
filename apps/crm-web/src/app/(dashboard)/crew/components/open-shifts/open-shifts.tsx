import { Badge } from "@yan/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { formatDate } from "@/utils/format-date/format-date";
import { todayISO } from "@/utils/today-iso/today-iso";

import type { TimekeepingRecord } from "../../types";

/**
 * Đang làm — shifts clocked in and not yet out, above the weekly grid.
 *
 * Read-only by design: an open shift has no end time and no hours, so there is
 * nothing to duyệt (the API's decide refuses anything that is not pending). It
 * is here because nothing sweeps these — a worker who went home without chấm
 * công ra leaves a row that only they can close, and this is where the operator
 * finds out. Renders nothing when no one is clocked in.
 */
export function OpenShifts({ shifts }: { shifts: TimekeepingRecord[] }) {
  if (shifts.length === 0) return null;

  const today = todayISO();
  // Stale = clocked in on an earlier day. Same predicate the API answers with
  // `?status=open&to=<yesterday>` and the mini app calls `stale`.
  const staleCount = shifts.filter((s) => s.work_date < today).length;

  const memberName = (record: TimekeepingRecord) =>
    record.crew_member?.name ?? `Nhân sự #${record.crew_member_id}`;
  const projectLabel = (record: TimekeepingRecord) =>
    record.project
      ? `${record.project.code} · ${record.project.name}`
      : `Công trình #${record.project_id}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle>Đang làm</CardTitle>
        <Badge variant="secondary">{shifts.length}</Badge>
        {staleCount > 0 ? (
          <Badge variant="warning">{staleCount} quá hạn</Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {shifts.map((shift) => {
            const stale = shift.work_date < today;
            return (
              <li key={shift.id} className="flex flex-col gap-1 py-3">
                <p className="text-sm font-medium">
                  {memberName(shift)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {projectLabel(shift)}
                  </span>
                </p>
                <p className="text-muted-foreground text-sm">
                  Vào lúc {shift.start_time ?? "—"} ·{" "}
                  {formatDate(shift.work_date)}
                </p>
                {/* The word carries the state, not the badge colour. */}
                {stale ? (
                  <p className="text-muted-foreground text-sm">
                    <Badge variant="warning">Quá hạn</Badge> Chưa chấm công ra —
                    nhân sự cần gửi đơn bù công để chốt giờ ra.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

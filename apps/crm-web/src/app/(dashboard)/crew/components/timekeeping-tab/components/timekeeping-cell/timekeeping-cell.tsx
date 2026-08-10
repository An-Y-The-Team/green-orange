"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Input } from "@yan/ui/components/input";
import { TableCell } from "@yan/ui/components/table";
import { cn } from "@yan/ui/lib/utils";

import { TIMEKEEPING_SOURCES, TIMEKEEPING_STATUSES } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatDate } from "@/utils/format-date/format-date";

import {
  deleteTimekeeping,
  upsertTimekeeping,
} from "../../../../actions/timekeeping";
import type { TimekeepingRecord } from "../../../../types";

/**
 * One member × one day of the chấm công week — and the reason it is its own
 * component: the pending state has to belong to the cell being saved.
 *
 * The grid used to hold ONE `useTransition` and put `disabled={isSaving}` on all
 * 35 inputs, so tabbing across a week disabled the cell you were about to type
 * into while the previous save was still in flight. At 600ms latency that
 * dropped the keystroke outright (reproduced in plan 00). Per-cell state means a
 * save can only ever block its own box.
 *
 * The cell also owns its value after birth: it is the only writer, so a save
 * does not need a week refetch to stay truthful, and nothing remounts it
 * mid-typing. Switching project or week rebuilds every cell via its `key`.
 */
export function TimekeepingCell({
  projectId,
  memberName,
  memberId,
  date,
  weekday,
  manual,
  zalo,
  onSaved,
  onDeleted,
}: {
  projectId: number;
  memberName: string;
  memberId: number;
  date: string;
  weekday: string;
  /** The manual row for this member+day, if one exists. */
  manual?: TimekeepingRecord;
  /** A zalo_app row for the same day — displayed, overridable, never edited. */
  zalo?: TimekeepingRecord;
  onSaved: (record: TimekeepingRecord) => void;
  onDeleted: (id: number) => void;
}) {
  const born = manual ?? zalo;
  const [value, setValue] = useState(born ? String(born.hours) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // The manual row this cell knows about — its own writes keep it current, so
  // clearing the box after a save still knows what to DELETE.
  const [row, setRow] = useState<TimekeepingRecord | undefined>(manual);

  const [savePending, save] = useRun<
    { crew_member_id: number; work_date: string; hours: number },
    TimekeepingRecord
  >(
    upsertTimekeeping.bind(null, projectId),
    (record) => {
      if (!record) return;
      setRow(record);
      setSaved(true);
      onSaved(record);
    },
    { silent: true }
  );

  const [deletePending, remove] = useRun(
    deleteTimekeeping.bind(null, row?.id ?? 0, projectId),
    () => {
      if (row) onDeleted(row.id);
      setRow(undefined);
      setSaved(true);
    },
    { silent: true }
  );

  const pending = savePending || deletePending;

  // Blur commits. Blank means "no hours recorded", which is a DIFFERENT fact
  // from zero — so it deletes the row instead of the old code's silent bail,
  // which left a wrong 8 on the sheet with no way to take it off.
  const commit = () => {
    const raw = value.trim();
    setSaved(false);

    if (raw === "") {
      setError(null);
      if (row) remove();
      return;
    }

    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours < 0) {
      setError("Giờ không hợp lệ");
      return;
    }
    setError(null);
    if (row && row.hours === hours) return;
    save({ crew_member_id: memberId, work_date: date, hours });
  };

  const fromZalo = zalo && !row;

  return (
    <TableCell className="p-1 text-center align-top">
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative">
          {/* Not type="number": the cell commits on BLUR, so a stray scroll
              wheel over a focused cell stepped the hours and wrote the result.
              inputMode keeps the numeric keypad on a phone; `commit` parses and
              rejects visibly. */}
          <Input
            inputMode="decimal"
            value={value}
            // Only this cell is ever disabled, and only while its own write is
            // in flight — never its neighbours.
            disabled={pending}
            aria-label={`${memberName} — ${weekday} ${formatDate(date)}`}
            aria-invalid={error ? true : undefined}
            className={cn(
              "h-8 w-14 text-center",
              error && "border-destructive",
              saved && !pending && "border-emerald-500"
            )}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
          />
          {pending ? (
            <Loader2 className="pointer-events-none absolute -right-4 top-2 size-3.5 animate-spin text-muted-foreground" />
          ) : null}
          {saved && !pending ? (
            <Check className="pointer-events-none absolute -right-4 top-2 size-3.5 text-emerald-600" />
          ) : null}
        </div>

        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : fromZalo ? (
          // Shown, not locked: the backend prefers a manual row for the same
          // member+day, so typing here is the documented way to correct a wrong
          // punch from the app — which the read-only cell made impossible.
          <Badge
            variant="secondary"
            className="text-xs"
            title="Giờ từ ứng dụng Zalo — nhập tay để ghi đè"
          >
            {TIMEKEEPING_SOURCES[zalo.source] ?? zalo.source}
            {" · "}
            {TIMEKEEPING_STATUSES[zalo.status] ?? zalo.status}
          </Badge>
        ) : null}
      </div>
    </TableCell>
  );
}

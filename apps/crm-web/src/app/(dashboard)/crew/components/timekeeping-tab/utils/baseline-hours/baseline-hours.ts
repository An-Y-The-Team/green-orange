import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

/**
 * The hours a cell is already showing — what a blur must compare against before
 * it writes anything.
 *
 * The bug this exists for: the old guard was `if (row && row.hours === hours)`,
 * where `row` is only ever the MANUAL row. On a cell whose only row came from
 * Zalo, `row` is undefined, so the guard could not fire and merely tabbing
 * through the cell POSTed `source: "manual"` — a row born `approved` that then
 * wins over the Zalo row forever via manual-precedence. That silently approved
 * a worker's unreviewed claim without going through POST /timekeeping/:id/decide,
 * reattributed an already-approved day to hand entry, and for a shift still open
 * banked an approved `0` that survived the operator later duyệt-ing the real hours.
 *
 * Deliberately status-agnostic: the baseline is whatever the operator can see,
 * whether that row is open, pending, rejected or approved. A future fifth status
 * cannot reopen the hole.
 *
 * `undefined` (not 0) when the cell is empty, so a first entry always writes —
 * and note 0 is a real recorded value, distinct from an empty box.
 */
export const baselineHours = ({
  manual,
  zalo,
}: {
  manual?: TimekeepingRecord;
  zalo?: TimekeepingRecord;
}): number | undefined => manual?.hours ?? zalo?.hours;

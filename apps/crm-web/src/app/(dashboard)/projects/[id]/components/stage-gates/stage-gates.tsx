import { Card, CardContent } from "@yan/ui/components/card";

import { ChecklistRow } from "@/components/checklist-row/checklist-row";

import type { StageGate } from "../../utils/stage-gates/stage-gates";

/**
 * The current stage's "điều kiện hoàn thành", under the rail.
 *
 * Seven of the eight stage panels never told the operator what the job still
 * needed — the rule lived only in the backend, so the UI could say "the server
 * said 409" but never why. This is that answer, in the place the question gets
 * asked.
 *
 * Soft by design: nothing here blocks a stage move (see `stageGates`). The
 * heading says so, once, instead of each row hedging.
 */
export function StageGates({ gates }: { gates: StageGate[] }) {
  if (gates.length === 0) return null;

  const remaining = gates.filter((g) => !g.done).length;

  return (
    <Card className="mb-4">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="text-sm font-medium">Điều kiện hoàn thành</h2>
          <p className="text-xs text-muted-foreground">
            {remaining === 0
              ? "Đủ điều kiện chuyển giai đoạn."
              : `Còn ${remaining} việc — vẫn có thể chuyển giai đoạn trước khi xong.`}
          </p>
        </div>
        {gates.map((g) => (
          <ChecklistRow
            key={g.key}
            done={g.done}
            label={g.label}
            detail={
              g.detail ? (
                <span className="text-sm text-muted-foreground">
                  {g.detail}
                </span>
              ) : undefined
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}

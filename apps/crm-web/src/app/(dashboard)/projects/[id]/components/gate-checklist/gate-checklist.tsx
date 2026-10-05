import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@yan/ui/lib/utils";

import { ChecklistRow } from "@/components/checklist-row/checklist-row";
import { PROJECT_STAGES, PROJECT_STAGE_ORDER } from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import type { GateKey, ProjectStage } from "../../../enums";
import { nextGate } from "../../utils/next-gate/next-gate";
import type { StageGate } from "../../utils/stage-gates/stage-gates";

/**
 * Key → the button that completes that row. `primary` is true for exactly one
 * row: the next one. A key is left out while its action doesn't apply yet.
 */
export type GateActions = Partial<
  Record<GateKey, (primary: boolean) => ReactNode>
>;

/**
 * A stage's "Việc cần làm": every condition the job still needs, each with the
 * button that satisfies it. Gate = task — the checklist used to be a read-only
 * card above the panel while the real buttons sat in the footer, so the
 * operator read one place and clicked another.
 *
 * Soft by design: nothing here blocks a stage move. The stage moves by itself
 * when the server sees the work done (crm-api-nest common/stage.ts); the hint
 * under the next row says so only when finishing that row really will.
 */
export function GateChecklist({
  stage,
  gates,
  actions,
}: {
  stage: ProjectStage;
  gates: StageGate[];
  actions: GateActions;
}) {
  if (gates.length === 0) return null;

  const actionable = new Set(
    (Object.keys(actions) as GateKey[]).filter((k) => actions[k])
  );
  const next = nextGate({ gates, actionable });
  const open = gates.filter((g) => !g.done).length;
  const nextStage = PROJECT_STAGE_ORDER[PROJECT_STAGE_ORDER.indexOf(stage) + 1];

  return (
    <section aria-labelledby="gate-checklist-title" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id="gate-checklist-title" className="text-sm font-medium">
          Việc cần làm
        </h3>
        <p className="text-xs text-muted-foreground">
          {open === 0
            ? "Đã xong hết việc của giai đoạn này."
            : `Còn ${open} việc`}
        </p>
      </div>
      <ul className="divide-y rounded-lg border">
        {gates.map((g) => {
          const isNext = g.key === next?.key;
          // Promise the move only when it is true: this row triggers the
          // server's auto-advance AND it is the last thing left.
          const moves = isNext && g.advances && open === 1 && nextStage;
          return (
            <li
              key={g.key}
              className={cn("px-4 py-3", isNext && "bg-now-soft")}
            >
              <ChecklistRow
                done={g.done}
                label={g.label}
                detail={
                  g.detail ? (
                    <span className="text-sm text-muted-foreground">
                      {g.detail}
                    </span>
                  ) : undefined
                }
                action={g.done ? undefined : actions[g.key]?.(isNext)}
              />
              {moves ? (
                <p className="mt-1 flex items-center gap-1 pl-7 text-xs font-medium text-now">
                  <ArrowRight aria-hidden className="size-3.5" />
                  Xong việc này → tự chuyển sang{" "}
                  {labelOf(PROJECT_STAGES, nextStage).label}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

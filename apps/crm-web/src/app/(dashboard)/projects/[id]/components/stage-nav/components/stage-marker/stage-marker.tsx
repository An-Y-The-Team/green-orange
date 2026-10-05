import { Check } from "lucide-react";

import { cn } from "@yan/ui/lib/utils";

import { StageState } from "../../utils/stage-state/stage-state";

// Said out loud: the marker's colour is never the only cue (WCAG 1.4.1).
const SPOKEN: Record<StageState, string> = {
  [StageState.DONE]: "đã xong",
  [StageState.CURRENT]: "đang làm",
  [StageState.LEFTOVER]: "còn việc",
  [StageState.PARALLEL]: "song song",
  [StageState.FUTURE]: "chưa tới",
};

// Status tones only — green is reserved for the primary button
// (crm-ui-redesign.md, "Buttons vs badges").
const TONE: Record<StageState, string> = {
  [StageState.DONE]: "border-done bg-done text-background",
  [StageState.CURRENT]: "border-now bg-now text-background",
  [StageState.LEFTOVER]: "border-waiting bg-waiting-soft text-waiting",
  [StageState.PARALLEL]:
    "border-now text-now bg-[linear-gradient(90deg,var(--now-soft)_50%,transparent_50%)]",
  [StageState.FUTURE]: "border-border text-muted-foreground",
};

/** The numbered circle in front of a stage — or, for a pane, its count. */
export function StageMarker({
  state,
  number,
}: {
  state: StageState;
  number: number;
}) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold tabular-nums",
        TONE[state]
      )}
    >
      {state === StageState.DONE ? (
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
      ) : state === StageState.LEFTOVER ? (
        <span aria-hidden>!</span>
      ) : (
        <span aria-hidden>{number}</span>
      )}
      <span className="sr-only">{SPOKEN[state]}</span>
    </span>
  );
}

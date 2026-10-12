import type { ReactNode } from "react";

import { cn } from "@yan/ui/lib/utils";

import { StepState } from "./enums";

export interface StepItem {
  key: string;
  title: string;
  state: StepState;
  summary?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
}

const STATE_TEXT: Record<StepState, string> = {
  [StepState.DONE]: "Đã xong",
  [StepState.NOW]: "Đang làm",
  [StepState.FUTURE]: "Chưa tới",
};

const MARKER_CLASS: Record<StepState, string> = {
  [StepState.DONE]: "bg-done text-white",
  [StepState.NOW]: "bg-now text-white",
  [StepState.FUTURE]: "bg-muted text-muted-foreground",
};

/**
 * The vertical numbered stepper from the design boards: a marker per step on a
 * 2px rail, the open step's body in a boxed pane. No logic; the caller decides
 * each step's state. The marker carries sr-only state text so colour is never
 * the only signal.
 */
export function StepList({
  steps,
  "aria-label": ariaLabel,
}: {
  steps: StepItem[];
  "aria-label": string;
}) {
  return (
    <ol aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const isLast = i === steps?.length - 1;
        const isNow = step.state === StepState.NOW;
        return (
          <li
            key={step.key}
            aria-current={isNow ? "step" : undefined}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                  MARKER_CLASS[step.state]
                )}
              >
                <span aria-hidden="true">
                  {step.state === StepState.DONE ? "✓" : i + 1}
                </span>
                <span className="sr-only">{STATE_TEXT[step.state]}</span>
              </span>
              {isLast ? null : <span className="w-0.5 flex-1 bg-border" />}
            </div>
            <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{step.title}</span>
                {step.badge}
              </div>
              {!isNow && step.summary ? (
                <p className="text-sm text-muted-foreground">{step.summary}</p>
              ) : null}
              {isNow && step.children ? (
                <div className="mt-2 rounded-xl border-2 border-now p-4">
                  {step.children}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

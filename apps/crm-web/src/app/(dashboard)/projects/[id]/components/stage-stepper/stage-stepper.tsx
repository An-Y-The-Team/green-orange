"use client";

import { Check } from "lucide-react";
import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { cn } from "@yan/ui/lib/utils";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { PROJECT_STAGES, PROJECT_STAGE_ORDER } from "@/constants/labels";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";
import { labelOf } from "@/utils/label-of/label-of";

import { updateProject } from "../../../actions/update-project";
import { ProjectStatus } from "../../../enums";
import type { Project } from "../../../types";
import {
  type StageGate,
  gateProgress,
} from "../../utils/stage-gates/stage-gates";

export function StageStepper({
  project,
  gates,
}: {
  project: Project;
  /** The current stage's conditions — the count on the current step, and the
      unmet ones listed in the forward confirm. */
  gates: StageGate[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    { success: false } as ServerActionState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
  });

  const currentIndex = PROJECT_STAGE_ORDER.indexOf(project.stage);
  const nextStage = PROJECT_STAGE_ORDER[currentIndex + 1];
  const prevStage = PROJECT_STAGE_ORDER[currentIndex - 1];
  // Frozen (on_hold/cancelled) jobs can't advance until reactivated.
  const canAdvance =
    project.status === ProjectStatus.ACTIVE && Boolean(nextStage);
  // Only one step back, via the explicit button — chips are display-only, so a
  // click can never move the stage (the old backward-only chips read as broken).
  // Backend allows closed → settlement (reopen), which is exactly prevStage.
  const canGoBack =
    project.status === ProjectStatus.ACTIVE && Boolean(prevStage);

  const goBack = () => startTransition(() => formAction({ stage: prevStage }));
  const goForward = () =>
    startTransition(() => formAction({ stage: nextStage }));

  // The confirm sits on the FORWARD move, which is the consequential one:
  // entering a stage seeds its artifacts and, for the later stages, freezes what
  // came before. Moving BACK is a plain button — the dialog it used to have said
  // itself that later-stage data is kept, so it was asking permission for the
  // harmless direction.
  //
  // The consequence line names the work that is actually outstanding, from the
  // same gate array the panel renders. Still a soft warning: the pipeline is
  // forward-only and never hard-blocked, so the dialog reports and proceeds.
  const unmet = gates.filter((g) => !g.done);
  const progress = gateProgress(gates);
  const forwardButton = canAdvance ? (
    <ConfirmAction
      trigger={
        <Button size="sm" disabled={isPending}>
          Chuyển sang: {labelOf(PROJECT_STAGES, nextStage).label}
        </Button>
      }
      title={`Chuyển sang "${labelOf(PROJECT_STAGES, nextStage).label}"?`}
      consequence={
        unmet.length === 0 ? (
          `Giai đoạn "${labelOf(PROJECT_STAGES, project.stage).label}" đã xong hết điều kiện.`
        ) : (
          <>
            {`Giai đoạn "${labelOf(PROJECT_STAGES, project.stage).label}" còn ${unmet.length} việc chưa xong:`}
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {unmet.map((g) => (
                <li key={g.key}>
                  {g.label}
                  {g.detail ? ` (${g.detail})` : ""}
                </li>
              ))}
            </ul>
            <span className="mt-2 block">
              Hệ thống vẫn cho chuyển — xác nhận nếu bạn muốn đi tiếp.
            </span>
          </>
        )
      }
      confirmLabel="Chuyển giai đoạn"
      pending={isPending}
      onConfirm={goForward}
    />
  ) : null;

  const backButton = canGoBack ? (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={goBack}
      title="Dữ liệu đã nhập ở các giai đoạn sau được giữ nguyên"
    >
      ← {labelOf(PROJECT_STAGES, prevStage).label}
    </Button>
  ) : null;

  return (
    <div className="mb-6">
      {/* Compact pill below md. */}
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-medium">
          {currentIndex + 1}/{PROJECT_STAGE_ORDER.length} ·{" "}
          {labelOf(PROJECT_STAGES, project.stage).label}
        </span>
        {backButton}
        {forwardButton}
      </div>

      {/* Full pipeline line at md+. An ordered list, because that is what it
          is: the app's primary orientation widget used to be div/span with no
          list semantics and no aria-current, so a screen reader heard eight
          unrelated labels and no indication of where the job stood. */}
      <div className="hidden items-start gap-3 md:flex">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {PROJECT_STAGE_ORDER?.map((stage, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            return (
              <li
                key={stage}
                aria-current={current ? "step" : undefined}
                className="flex items-center gap-2"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    done && "bg-primary text-primary-foreground",
                    current &&
                      "bg-primary text-primary-foreground ring-2 ring-primary/30",
                    !done && !current && "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    // Underline as well as weight: done and current were both
                    // solid black dots, so at a glance you could not tell which
                    // stage the job was actually in (WCAG 1.4.1).
                    current
                      ? "font-semibold text-foreground underline decoration-2 underline-offset-4"
                      : "text-muted-foreground"
                  )}
                >
                  {labelOf(PROJECT_STAGES, stage).label}
                </span>
                {/* Answers "what does this job need" without scrolling to
                    the panel. Current step only — a count on a finished or
                    future stage would be noise. */}
                {current && progress ? (
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {progress.done}/{progress.total} điều kiện
                  </span>
                ) : null}
                {/* The state the colour carries, said out loud. */}
                <span className="sr-only">
                  {done
                    ? "đã xong"
                    : current
                      ? "giai đoạn hiện tại"
                      : "chưa tới"}
                </span>
                {i < PROJECT_STAGE_ORDER.length - 1 && (
                  <span className="mx-0.5 h-px w-4 bg-border" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
        {/* The two actions share a wrapper so a wrapping rail can't leave them
            sitting beside step 8, reading as that step's own buttons. */}
        {backButton || forwardButton ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {backButton}
            {forwardButton}
          </div>
        ) : null}
      </div>
    </div>
  );
}

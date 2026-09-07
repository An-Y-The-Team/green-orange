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

export function StageStepper({ project }: { project: Project }) {
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
  // ponytail: the consequence line is generic because there is no per-stage gate
  // model on the client — only the contract panel computes its own checklist. A
  // real "còn thiếu: …" list is its own piece of work (see plan 11 in the
  // review); until then say plainly that the move is allowed either way.
  const forwardButton = canAdvance ? (
    <ConfirmAction
      trigger={
        <Button size="sm" disabled={isPending}>
          Chuyển sang: {labelOf(PROJECT_STAGES, nextStage).label}
        </Button>
      }
      title={`Chuyển sang "${labelOf(PROJECT_STAGES, nextStage).label}"?`}
      consequence={`Công trình đang ở "${labelOf(PROJECT_STAGES, project.stage).label}". Hệ thống vẫn cho chuyển khi giai đoạn này chưa xong — kiểm tra lại phần việc còn thiếu trước khi xác nhận.`}
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

      {/* Full pipeline line at md+. */}
      <div className="hidden flex-wrap items-center gap-x-2 gap-y-3 md:flex">
        {PROJECT_STAGE_ORDER?.map((stage, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={stage} className="flex items-center gap-2">
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
                  current
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {labelOf(PROJECT_STAGES, stage).label}
              </span>
              {i < PROJECT_STAGE_ORDER.length - 1 && (
                <span className="mx-0.5 h-px w-4 bg-border" aria-hidden />
              )}
            </div>
          );
        })}
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

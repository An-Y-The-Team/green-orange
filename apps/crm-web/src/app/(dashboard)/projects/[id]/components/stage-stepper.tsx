"use client";

import { Check } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { cn } from "@yan/ui/lib/utils";

import { projectStage, projectStageOrder } from "@/lib/labels";

import { updateProject } from "../../actions/update-project";
import { ProjectStage, ProjectStatus } from "../../enums";
import type { Project } from "../../types";

export function StageStepper({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    { success: false } as ServerActionState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
  });

  const currentIndex = projectStageOrder.indexOf(project.stage);
  const nextStage = projectStageOrder[currentIndex + 1];
  const prevStage = projectStageOrder[currentIndex - 1];
  // Frozen (on_hold/cancelled) jobs can't advance until reactivated.
  const canAdvance =
    project.status === ProjectStatus.ACTIVE && Boolean(nextStage);
  const canGoBack =
    project.status === ProjectStatus.ACTIVE && Boolean(prevStage);
  // Backend only allows closed → settlement (reopen); other closed moves 409.
  const canGoBackTo = (stage: ProjectStage) =>
    canGoBack &&
    (project.stage !== ProjectStage.CLOSED ||
      stage === ProjectStage.SETTLEMENT);
  // Soft guard for mistaken advances: moving back is always confirm-gated,
  // and data entered in later stages is kept (stages are soft, per design).
  const [backTarget, setBackTarget] = useState<ProjectStage | null>(null);
  const goBack = (stage: ProjectStage) => setBackTarget(stage);
  const confirmGoBack = () => {
    if (backTarget) startTransition(() => formAction({ stage: backTarget }));
    setBackTarget(null);
  };

  return (
    <div className="mb-6">
      <Dialog
        open={backTarget !== null}
        onOpenChange={(open) => !open && setBackTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Quay lại giai đoạn &ldquo;
              {backTarget ? projectStage[backTarget].label : ""}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              Dữ liệu đã nhập ở các giai đoạn sau sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackTarget(null)}>
              Hủy
            </Button>
            <Button disabled={isPending} onClick={confirmGoBack}>
              Quay lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compact pill below md. */}
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-medium">
          {currentIndex + 1}/{projectStageOrder.length} ·{" "}
          {projectStage[project.stage].label}
        </span>
        {canGoBackTo(prevStage) ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => goBack(prevStage)}
          >
            ← {projectStage[prevStage].label}
          </Button>
        ) : null}
        {canAdvance ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => formAction({ stage: nextStage }))
            }
          >
            → {projectStage[nextStage].label}
          </Button>
        ) : null}
      </div>

      {/* Full pipeline line at md+. */}
      <div className="hidden flex-wrap items-center gap-x-2 gap-y-3 md:flex">
        {projectStageOrder.map((stage, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const pill = (
            <>
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
                {projectStage[stage].label}
              </span>
            </>
          );
          return (
            <div key={stage} className="flex items-center gap-2">
              {done && canGoBackTo(stage) ? (
                <button
                  type="button"
                  disabled={isPending}
                  title={`Quay lại: ${projectStage[stage].label}`}
                  onClick={() => goBack(stage)}
                  className="flex cursor-pointer items-center gap-2 hover:opacity-80"
                >
                  {pill}
                </button>
              ) : (
                <a href={`#stage-${stage}`} className="flex items-center gap-2">
                  {pill}
                </a>
              )}
              {i < projectStageOrder.length - 1 && (
                <span className="mx-0.5 h-px w-4 bg-border" aria-hidden />
              )}
            </div>
          );
        })}
        {canGoBackTo(prevStage) ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            disabled={isPending}
            onClick={() => goBack(prevStage)}
          >
            ← {projectStage[prevStage].label}
          </Button>
        ) : null}
        {canAdvance ? (
          <Button
            size="sm"
            className={canGoBackTo(prevStage) ? undefined : "ml-2"}
            disabled={isPending}
            onClick={() =>
              startTransition(() => formAction({ stage: nextStage }))
            }
          >
            Chuyển sang: {projectStage[nextStage].label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

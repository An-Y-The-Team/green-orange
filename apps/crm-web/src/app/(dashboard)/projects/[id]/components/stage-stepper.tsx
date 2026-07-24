"use client";

import { Check } from "lucide-react";
import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { cn } from "@yan/ui/lib/utils";

import { projectStage, projectStageOrder } from "@/lib/labels";

import { updateProject } from "../../actions/update-project";
import { ProjectStatus } from "../../enums";
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
  // Frozen (on_hold/cancelled) jobs can't advance until reactivated.
  const canAdvance =
    project.status === ProjectStatus.ACTIVE && Boolean(nextStage);

  return (
    <div className="mb-6">
      {/* Compact pill below md. */}
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-medium">
          {currentIndex + 1}/{projectStageOrder.length} ·{" "}
          {projectStage[project.stage].label}
        </span>
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
          return (
            <a
              key={stage}
              href={`#stage-${stage}`}
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
                  current
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {projectStage[stage].label}
              </span>
              {i < projectStageOrder.length - 1 && (
                <span className="mx-0.5 h-px w-4 bg-border" aria-hidden />
              )}
            </a>
          );
        })}
        {canAdvance ? (
          <Button
            size="sm"
            className="ml-2"
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

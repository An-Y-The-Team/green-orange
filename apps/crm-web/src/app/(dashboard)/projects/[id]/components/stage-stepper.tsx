"use client";

import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";

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

      {/* Full rail at md+. */}
      <div className="hidden flex-wrap items-center gap-1.5 md:flex">
        {projectStageOrder.map((stage, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <a
              key={stage}
              href={`#stage-${stage}`}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                current
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground",
              ].join(" ")}
            >
              {i + 1}. {projectStage[stage].label}
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

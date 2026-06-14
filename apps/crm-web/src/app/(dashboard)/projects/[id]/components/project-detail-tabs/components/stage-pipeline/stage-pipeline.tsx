import { Check } from "lucide-react";

import { cn } from "@yan/ui/lib/utils";

import { projectStage, projectStageOrder } from "@/lib/labels";
import type { ProjectStage } from "@/types";

/**
 * Horizontal stepper of the Công Trình lifecycle. Stages before the current one
 * render as done (filled + check), the current one is highlighted, the rest are
 * upcoming/muted. Pure render — safe in a Server Component.
 */
export function StagePipeline({ current }: { current: ProjectStage }) {
  const currentIndex = projectStageOrder.indexOf(current);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {projectStageOrder.map((stage, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={stage} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                done && "bg-primary text-primary-foreground",
                active &&
                  "bg-primary text-primary-foreground ring-2 ring-primary/30",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {projectStage[stage].label}
            </span>
            {index < projectStageOrder.length - 1 && (
              <span className="mx-0.5 h-px w-4 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

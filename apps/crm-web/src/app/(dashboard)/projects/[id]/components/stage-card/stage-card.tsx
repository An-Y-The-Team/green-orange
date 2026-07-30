import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { PROJECT_STAGES, PROJECT_STAGE_ORDER } from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import type { Project } from "../../../types";

/**
 * The Card + "Giai đoạn N · label" shell every stage panel renders.
 *
 * The number is derived from `PROJECT_STAGE_ORDER`, never written by hand: each
 * panel used to hardcode it, and merging Khảo sát into Yêu cầu left five of them
 * one too high — the stepper said "7/8" while the panel below said "Giai đoạn 8".
 *
 * `id` matches the stepper's `#stage-<stage>` anchors (stage-stepper.tsx).
 */
export function StageCard({
  project,
  aside,
  contentClassName,
  children,
}: {
  project: Project;
  /** Rendered right-aligned in the header — a sub-status badge or an action. */
  aside?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card id={`stage-${project.stage}`} className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm uppercase tracking-wide text-muted-foreground">
          <span>
            Giai đoạn {PROJECT_STAGE_ORDER.indexOf(project.stage) + 1} ·{" "}
            {labelOf(PROJECT_STAGES, project.stage).label}
          </span>
          {aside}
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

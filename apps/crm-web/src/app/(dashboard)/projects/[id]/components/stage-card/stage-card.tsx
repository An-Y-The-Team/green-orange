import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardFooter,
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
 *
 * Action grammar (docs/features/crm-ui-redesign.md, "Panel action grammar"):
 * the header carries status or the list's add button, the body carries `sm`
 * row/field actions, and the footer carries the stage's next step — one
 * primary at the right, stage-level secondaries (print, reopen) to its left.
 * Every panel used to place its exit button somewhere else.
 */
export function StageCard({
  project,
  aside,
  footer,
  contentClassName,
  children,
}: {
  project: Project;
  /** Rendered right of the title, outside the heading — a badge, a count, an add. */
  aside?: ReactNode;
  /** The stage's next step: default-size buttons, primary last. */
  footer?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card id={`stage-${project.stage}`} className="mb-6 scroll-mt-4">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle
          as="h2"
          className="text-sm uppercase tracking-wide text-muted-foreground"
        >
          Giai đoạn {PROJECT_STAGE_ORDER.indexOf(project.stage) + 1} ·{" "}
          {labelOf(PROJECT_STAGES, project.stage).label}
        </CardTitle>
        {aside}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
      {footer ? (
        <CardFooter className="flex-wrap justify-end gap-2 border-t pt-4">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

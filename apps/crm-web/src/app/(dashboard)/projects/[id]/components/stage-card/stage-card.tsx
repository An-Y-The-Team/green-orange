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

import type { ProjectStage } from "../../../enums";

/**
 * The Card + "Giai đoạn N · label" shell every stage panel renders.
 *
 * The number is derived from `PROJECT_STAGE_ORDER`, never written by hand: each
 * panel used to hardcode it, and merging Khảo sát into Yêu cầu left five of them
 * one too high — the stepper said "7/8" while the panel below said "Giai đoạn 8".
 *
 * `stage` is the card's OWN stage, not the project's: the workspace nav can
 * open a past stage, and its card must still say "Giai đoạn 2 · Báo giá".
 * `id` is the `#stage-<stage>` anchor.
 *
 * Action grammar (docs/features/crm-ui-redesign.md, "Panel action grammar"):
 * the header carries status or the list's add button, the body carries `sm`
 * row/field actions, and the footer carries the stage's next step — one
 * primary at the right, stage-level secondaries (print, reopen) to its left.
 * Every panel used to place its exit button somewhere else.
 */
export function StageCard({
  stage,
  aside,
  footer,
  contentClassName,
  children,
}: {
  stage: ProjectStage;
  /** Rendered right of the title, outside the heading — a badge, a count, an add. */
  aside?: ReactNode;
  /** The stage's next step: default-size buttons, primary last. */
  footer?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card id={`stage-${stage}`} className="mb-6 scroll-mt-4">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle
          as="h2"
          className="text-sm uppercase tracking-wide text-muted-foreground"
        >
          Giai đoạn {PROJECT_STAGE_ORDER.indexOf(stage) + 1} ·{" "}
          {labelOf(PROJECT_STAGES, stage).label}
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

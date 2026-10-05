import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@yan/ui/lib/utils";

import {
  PROJECT_STAGES,
  PROJECT_STAGE_ORDER,
  STAGE_SHORT_LABELS,
  WORKSPACE_PANES,
} from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import { type ProjectStage, WorkspacePane } from "../../../enums";
import type { Project } from "../../../types";
import type { WorkspaceView } from "../../utils/parse-view/parse-view";
import {
  type StageGate,
  gateProgress,
} from "../../utils/stage-gates/stage-gates";
import { viewHref } from "../../utils/view-href/view-href";
import { StageMarker } from "./components/stage-marker/stage-marker";
import { StageState, stageState } from "./utils/stage-state/stage-state";

/**
 * The workspace's left pane: every stage, then Giấy tờ and Nhân sự. Any stage
 * opens — a past one for corrections, a future one as a preview — because the
 * stage moves by itself when the work is done (crm-api-nest common/stage.ts).
 * Below `lg` the same list lays out as a scrollable row of chips.
 */
export function StageNav({
  project,
  view,
  gatesByStage,
  documentCount,
  crewCount,
}: {
  project: Project;
  view: WorkspaceView;
  gatesByStage: Record<ProjectStage, StageGate[]>;
  documentCount: number;
  crewCount: number;
}) {
  // One line under the label: progress where there's work, "Xong" when done.
  const summaryOf = (state: StageState, gates: StageGate[]) => {
    if (state === StageState.DONE) return "Xong";
    if (state === StageState.FUTURE) return undefined;
    const progress = gateProgress(gates);
    return progress ? `${progress.done}/${progress.total} việc` : undefined;
  };

  return (
    <nav
      aria-label="Giai đoạn"
      className="min-w-0 lg:rounded-lg lg:bg-muted/50 lg:p-2"
    >
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {PROJECT_STAGE_ORDER.map((stage, i) => {
          const gates = gatesByStage[stage];
          const state = stageState(
            stage,
            project.stage,
            gates,
            project.paperwork_items
          );
          return (
            <NavItem
              key={stage}
              href={viewHref(project, stage)}
              selected={view === stage}
              marker={<StageMarker state={state} number={i + 1} />}
              label={labelOf(PROJECT_STAGES, stage).label}
              shortLabel={STAGE_SHORT_LABELS[stage]}
              summary={summaryOf(state, gates)}
              muted={state === StageState.FUTURE}
            />
          );
        })}
        <li aria-hidden className="hidden lg:my-2 lg:block lg:border-t" />
        <NavItem
          href={viewHref(project, WorkspacePane.DOCUMENTS)}
          selected={view === WorkspacePane.DOCUMENTS}
          marker={<PaneCount count={documentCount} />}
          label={WORKSPACE_PANES[WorkspacePane.DOCUMENTS]}
          summary="báo giá, hợp đồng, hóa đơn"
        />
        <NavItem
          href={viewHref(project, WorkspacePane.CREW)}
          selected={view === WorkspacePane.CREW}
          marker={<PaneCount count={crewCount} />}
          label={WORKSPACE_PANES[WorkspacePane.CREW]}
          summary="phân công, chấm công"
        />
      </ul>
    </nav>
  );
}

function NavItem({
  href,
  selected,
  marker,
  label,
  shortLabel = label,
  summary,
  muted,
}: {
  href: string;
  selected: boolean;
  marker: ReactNode;
  label: string;
  /** Chip text below lg, where "Quyết toán & Thanh toán" would crowd the row. */
  shortLabel?: string;
  summary?: string;
  muted?: boolean;
}) {
  return (
    <li className="shrink-0 lg:shrink">
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={cn(
          // Chip below lg (a rounded rectangle: pills are badges, never
          // controls), plain row in the vertical list.
          "flex items-center gap-2 whitespace-nowrap rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:items-start lg:whitespace-normal lg:border-transparent",
          selected
            ? "border-foreground bg-background font-medium lg:border-border lg:shadow-sm"
            : "hover:bg-muted",
          muted && !selected && "text-muted-foreground"
        )}
      >
        {marker}
        <span className="min-w-0">
          <span className="lg:hidden">{shortLabel}</span>
          <span className="hidden lg:block">{label}</span>
          {summary ? (
            <span className="hidden truncate text-xs text-muted-foreground lg:block">
              {summary}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

function PaneCount({ count }: { count: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border text-xs font-semibold tabular-nums text-muted-foreground">
      {count}
    </span>
  );
}

import { PROJECT_STAGE_ORDER } from "@/constants/labels";

import {
  PaperworkNeededFor,
  PaperworkStatus,
  ProjectStage,
} from "../../../../../enums";
import type { PaperworkItem } from "../../../../../types";
import type { StageGate } from "../../../../utils/stage-gates/stage-gates";

// How the nav marks a stage (crm-ui-redesign.md, "Buttons vs badges").
export enum StageState {
  DONE = "done",
  CURRENT = "current",
  // A past stage whose open work still matters: a row that moves the job (an
  // unpaid cọc after a manual move). Optional rows a backfilled job skipped
  // (no survey for a job created at Hợp đồng) don't count.
  LEFTOVER = "leftover",
  // Hồ sơ being prepared while the job is still at Hợp đồng.
  PARALLEL = "parallel",
  FUTURE = "future",
}

export function stageState(
  stage: ProjectStage,
  current: ProjectStage,
  gates: StageGate[],
  paperwork: PaperworkItem[] = []
): StageState {
  if (stage === current)
    return stage === ProjectStage.CLOSED ? StageState.DONE : StageState.CURRENT;
  const ahead =
    PROJECT_STAGE_ORDER.indexOf(stage) > PROJECT_STAGE_ORDER.indexOf(current);
  if (!ahead) {
    // A closed job is finished and read-only: nothing left to flag.
    if (current === ProjectStage.CLOSED) return StageState.DONE;
    // Click-through 2026-10-05: flagging EVERY open row painted "!" on stage 1
    // of every job created straight at a later stage — noise that teaches the
    // eye to ignore the marker. Only an open trigger row is real leftover.
    return gates.some((g) => !g.done && g.advances)
      ? StageState.LEFTOVER
      : StageState.DONE;
  }
  const paperworkStarted =
    stage === ProjectStage.PAPERWORK &&
    current === ProjectStage.CONTRACT &&
    paperwork.some(
      (p) =>
        p.needed_for === PaperworkNeededFor.EXECUTION &&
        p.status !== PaperworkStatus.PREPARING
    );
  return paperworkStarted ? StageState.PARALLEL : StageState.FUTURE;
}

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
  // A past stage missing something a later stage depends on — a row marked
  // `leftover` (no agreed quote, no cọc, paid without passing nghiệm thu).
  // Anything else a backfilled job skipped (survey, hồ sơ items) doesn't count.
  LEFTOVER = "leftover",
  // Hồ sơ being prepared while the job is still at Hợp đồng.
  PARALLEL = "parallel",
  FUTURE = "future",
}

export function stageState({
  stage,
  current,
  gates,
  paperwork = [],
}: {
  stage: ProjectStage;
  current: ProjectStage;
  gates: StageGate[];
  paperwork?: PaperworkItem[];
}): StageState {
  if (stage === current)
    return stage === ProjectStage.CLOSED ? StageState.DONE : StageState.CURRENT;
  const ahead =
    PROJECT_STAGE_ORDER.indexOf(stage) > PROJECT_STAGE_ORDER.indexOf(current);
  if (!ahead) {
    // A closed job is finished and read-only: nothing left to flag.
    if (current === ProjectStage.CLOSED) return StageState.DONE;
    // Flagging every open row (then every open trigger row) painted "!" on
    // most backfilled jobs — noise that teaches the eye to ignore the marker.
    // Only rows explicitly marked `leftover` in stageGates count.
    return gates.some((g) => !g.done && g.leftover)
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

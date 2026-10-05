import { describe, expect, test } from "vitest";

import {
  GateKey,
  PaperworkNeededFor,
  PaperworkStatus,
  ProjectStage,
} from "../../../../../enums";
import type { PaperworkItem } from "../../../../../types";
import { StageState, stageState } from "./stage-state";

const open = [
  { key: GateKey.DEPOSIT, label: "cọc", done: false, advances: true },
];
// An optional row a backfilled job skipped — open, but it moves nothing.
const skipped = [{ key: GateKey.VISIT, label: "gặp khách", done: false }];
const done = [{ key: GateKey.DEPOSIT, label: "cọc", done: true }];
const item = (
  status: PaperworkStatus,
  needed_for = PaperworkNeededFor.EXECUTION
) =>
  ({ id: 1, project_id: 1, name: "PCCC", status, needed_for }) as PaperworkItem;

describe("stageState", () => {
  test("the project's stage is current", () => {
    expect(stageState(ProjectStage.QUOTE, ProjectStage.QUOTE, open)).toBe(
      StageState.CURRENT
    );
  });

  test("a closed project's closed stage is done, not current", () => {
    expect(stageState(ProjectStage.CLOSED, ProjectStage.CLOSED, [])).toBe(
      StageState.DONE
    );
  });

  test("a past stage is leftover only when a row that moves the job is open", () => {
    expect(stageState(ProjectStage.QUOTE, ProjectStage.CONTRACT, done)).toBe(
      StageState.DONE
    );
    expect(stageState(ProjectStage.QUOTE, ProjectStage.CONTRACT, open)).toBe(
      StageState.LEFTOVER
    );
  });

  // Click-through finding: every job created straight at a later stage showed
  // "!" on Yêu cầu for a survey it never needed.
  test("skipped optional rows don't flag a past stage", () => {
    expect(
      stageState(ProjectStage.REQUEST, ProjectStage.CONTRACT, skipped)
    ).toBe(StageState.DONE);
  });

  test("nothing is leftover on a closed job", () => {
    expect(stageState(ProjectStage.CONTRACT, ProjectStage.CLOSED, open)).toBe(
      StageState.DONE
    );
  });

  test("Hồ sơ under way at Hợp đồng is parallel", () => {
    expect(
      stageState(ProjectStage.PAPERWORK, ProjectStage.CONTRACT, open, [
        item(PaperworkStatus.SUBMITTED),
      ])
    ).toBe(StageState.PARALLEL);
  });

  // Untouched items, or only later-stage documents moving, prove nothing.
  test("Hồ sơ not started, or only later-stage items, is future", () => {
    expect(
      stageState(ProjectStage.PAPERWORK, ProjectStage.CONTRACT, open, [
        item(PaperworkStatus.PREPARING),
        item(PaperworkStatus.APPROVED, PaperworkNeededFor.SETTLEMENT),
      ])
    ).toBe(StageState.FUTURE);
  });

  test("any other stage ahead is future", () => {
    expect(
      stageState(ProjectStage.EXECUTION, ProjectStage.CONTRACT, open)
    ).toBe(StageState.FUTURE);
  });
});

import { describe, expect, test } from "vitest";

import {
  AcceptanceSubStatus,
  GateKey,
  PaperworkNeededFor,
  PaperworkStatus,
  ProjectStage,
  ProjectStatus,
} from "../../../../../enums";
import type { PaperworkItem, Project } from "../../../../../types";
import { stageGates } from "../../../../utils/stage-gates/stage-gates";
import { StageState, stageState } from "./stage-state";

const open = [
  { key: GateKey.DEPOSIT, label: "cọc", done: false, leftover: true },
];
// An open row nothing later depends on (a skipped visit) — never a "!".
const skipped = [
  { key: GateKey.VISIT, label: "gặp khách", done: false, advances: true },
];
const done = [{ key: GateKey.DEPOSIT, label: "cọc", done: true }];
const item = (
  status: PaperworkStatus,
  needed_for = PaperworkNeededFor.EXECUTION,
  id = 1
) => ({ id, project_id: 1, name: "PCCC", status, needed_for }) as PaperworkItem;

describe("stageState", () => {
  test("the project's stage is current", () => {
    expect(
      stageState({
        stage: ProjectStage.QUOTE,
        current: ProjectStage.QUOTE,
        gates: open,
      })
    ).toBe(StageState.CURRENT);
  });

  test("a closed project's closed stage is done, not current", () => {
    expect(
      stageState({
        stage: ProjectStage.CLOSED,
        current: ProjectStage.CLOSED,
        gates: [],
      })
    ).toBe(StageState.DONE);
  });

  test("a past stage is leftover only when a `leftover` row is open", () => {
    expect(
      stageState({
        stage: ProjectStage.QUOTE,
        current: ProjectStage.CONTRACT,
        gates: done,
      })
    ).toBe(StageState.DONE);
    expect(
      stageState({
        stage: ProjectStage.QUOTE,
        current: ProjectStage.CONTRACT,
        gates: open,
      })
    ).toBe(StageState.LEFTOVER);
  });

  test("an open row without `leftover` — even a trigger — doesn't flag", () => {
    expect(
      stageState({
        stage: ProjectStage.REQUEST,
        current: ProjectStage.CONTRACT,
        gates: skipped,
      })
    ).toBe(StageState.DONE);
  });

  test("nothing is leftover on a closed job", () => {
    expect(
      stageState({
        stage: ProjectStage.CONTRACT,
        current: ProjectStage.CLOSED,
        gates: open,
      })
    ).toBe(StageState.DONE);
  });

  test("Hồ sơ under way at Hợp đồng is parallel", () => {
    expect(
      stageState({
        stage: ProjectStage.PAPERWORK,
        current: ProjectStage.CONTRACT,
        gates: open,
        paperwork: [item(PaperworkStatus.SUBMITTED)],
      })
    ).toBe(StageState.PARALLEL);
  });

  // Untouched items, or only later-stage documents moving, prove nothing.
  test("Hồ sơ not started, or only later-stage items, is future", () => {
    expect(
      stageState({
        stage: ProjectStage.PAPERWORK,
        current: ProjectStage.CONTRACT,
        gates: open,
        paperwork: [
          item(PaperworkStatus.PREPARING),
          item(PaperworkStatus.APPROVED, PaperworkNeededFor.SETTLEMENT),
        ],
      })
    ).toBe(StageState.FUTURE);
  });

  test("any other stage ahead is future", () => {
    expect(
      stageState({
        stage: ProjectStage.EXECUTION,
        current: ProjectStage.CONTRACT,
        gates: open,
      })
    ).toBe(StageState.FUTURE);
  });
});

// PR #84 review: the marker was still noisy on backfilled jobs. These run the
// real stageGates, so a `leftover` flag added to the wrong row fails here.
describe("stageState × stageGates on backfilled jobs", () => {
  const job = (over: Partial<Project>) =>
    ({
      id: 1,
      stage: ProjectStage.CONTRACT,
      status: ProjectStatus.ACTIVE,
      quotes: [],
      paperwork_items: [],
      ...over,
    }) as unknown as Project;

  const markOf = (project: Project, stage: ProjectStage) =>
    stageState({
      stage,
      current: project.stage,
      gates: stageGates({ project, stage }),
      paperwork: project.paperwork_items,
    });

  test("created at Hợp đồng with no quote: Báo giá flags, Yêu cầu doesn't", () => {
    const project = job({});
    expect(markOf(project, ProjectStage.REQUEST)).toBe(StageState.DONE);
    expect(markOf(project, ProjectStage.QUOTE)).toBe(StageState.LEFTOVER);
  });

  test("at Quyết toán with 8 hồ sơ still preparing: Hồ sơ doesn't flag", () => {
    const project = job({
      stage: ProjectStage.SETTLEMENT,
      acceptance_sub_status: AcceptanceSubStatus.PASSED,
      paperwork_items: Array.from({ length: 8 }, (_, i) =>
        item(PaperworkStatus.PREPARING, PaperworkNeededFor.EXECUTION, i + 1)
      ),
    });
    expect(markOf(project, ProjectStage.PAPERWORK)).toBe(StageState.DONE);
  });

  test("at Quyết toán without passing nghiệm thu: Nghiệm thu flags", () => {
    const project = job({ stage: ProjectStage.SETTLEMENT });
    expect(markOf(project, ProjectStage.ACCEPTANCE)).toBe(StageState.LEFTOVER);
  });

  test("a closed job shows none", () => {
    const project = job({ stage: ProjectStage.CLOSED });
    for (const stage of [
      ProjectStage.REQUEST,
      ProjectStage.QUOTE,
      ProjectStage.CONTRACT,
      ProjectStage.ACCEPTANCE,
    ])
      expect(markOf(project, stage), stage).toBe(StageState.DONE);
  });
});

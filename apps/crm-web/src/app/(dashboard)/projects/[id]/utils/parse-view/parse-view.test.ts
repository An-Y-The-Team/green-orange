import { describe, expect, test } from "vitest";

import { ProjectStage, WorkspacePane } from "../../../enums";
import { isStageView, parseView } from "./parse-view";

describe("parseView", () => {
  test("absent → the current stage", () => {
    expect(
      parseView({ raw: undefined, currentStage: ProjectStage.CONTRACT })
    ).toBe(ProjectStage.CONTRACT);
  });

  test("a stage or a pane is taken as is", () => {
    expect(
      parseView({ raw: "quote", currentStage: ProjectStage.CONTRACT })
    ).toBe(ProjectStage.QUOTE);
    expect(
      parseView({ raw: "documents", currentStage: ProjectStage.CONTRACT })
    ).toBe(WorkspacePane.DOCUMENTS);
  });

  // A stale bookmark (the old 9-stage "survey") or a doubled param must still
  // render the job, not a blank page.
  test("unknown or repeated → the current stage", () => {
    expect(parseView({ raw: "survey", currentStage: ProjectStage.QUOTE })).toBe(
      ProjectStage.QUOTE
    );
    expect(
      parseView({ raw: ["quote", "crew"], currentStage: ProjectStage.QUOTE })
    ).toBe(ProjectStage.QUOTE);
  });

  test("isStageView tells stages from panes", () => {
    expect(isStageView(ProjectStage.CLOSED)).toBe(true);
    expect(isStageView(WorkspacePane.CREW)).toBe(false);
  });
});

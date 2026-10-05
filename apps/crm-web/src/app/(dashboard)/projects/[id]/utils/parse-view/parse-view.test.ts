import { describe, expect, test } from "vitest";

import { ProjectStage, WorkspacePane } from "../../../enums";
import { isStageView, parseView } from "./parse-view";

describe("parseView", () => {
  test("absent → the current stage", () => {
    expect(parseView(undefined, ProjectStage.CONTRACT)).toBe(
      ProjectStage.CONTRACT
    );
  });

  test("a stage or a pane is taken as is", () => {
    expect(parseView("quote", ProjectStage.CONTRACT)).toBe(ProjectStage.QUOTE);
    expect(parseView("documents", ProjectStage.CONTRACT)).toBe(
      WorkspacePane.DOCUMENTS
    );
  });

  // A stale bookmark (the old 9-stage "survey") or a doubled param must still
  // render the job, not a blank page.
  test("unknown or repeated → the current stage", () => {
    expect(parseView("survey", ProjectStage.QUOTE)).toBe(ProjectStage.QUOTE);
    expect(parseView(["quote", "crew"], ProjectStage.QUOTE)).toBe(
      ProjectStage.QUOTE
    );
  });

  test("isStageView tells stages from panes", () => {
    expect(isStageView(ProjectStage.CLOSED)).toBe(true);
    expect(isStageView(WorkspacePane.CREW)).toBe(false);
  });
});

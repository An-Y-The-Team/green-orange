import { afterEach, expect, test, vi } from "vitest";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { PROJECT_STAGES } from "@/constants/labels";

import { labelOf } from "./label-of";

afterEach(() => vi.restoreAllMocks());

test("returns the mapped label and variant for a known key", () => {
  expect(labelOf(PROJECT_STAGES, ProjectStage.CLOSED)).toEqual({
    label: "Đã đóng",
    variant: "success",
  });
});

// The bug this guards: `PROJECT_STAGES[project.stage].label` on a stage the enum
// doesn't know (a legacy row, or one the backend added) threw a TypeError and
// took the whole project workspace down with it.
test("falls back to the raw key instead of throwing on an unmapped key", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  // Cast: the whole point is a value the type system says cannot happen.
  const unknown = "khao_sat" as ProjectStage;

  expect(labelOf(PROJECT_STAGES, unknown)).toEqual({
    label: "khao_sat",
    variant: "secondary",
  });
  expect(warn).toHaveBeenCalledOnce();
});

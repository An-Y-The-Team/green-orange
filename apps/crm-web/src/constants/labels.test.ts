import { expect, test } from "vitest";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { PROJECT_STAGES, PROJECT_STAGE_ORDER } from "./labels";

// PROJECT_STAGE_ORDER is derived from the enum now, so it cannot drift from it.
// What CAN still drift is the label map: adding a stage to the enum without a
// label renders `undefined` in the stepper, the list filter and the badge.
test("every stage in the pipeline has a label", () => {
  expect(PROJECT_STAGE_ORDER).toEqual(Object.values(ProjectStage));
  for (const stage of PROJECT_STAGE_ORDER) {
    expect(PROJECT_STAGES[stage]?.label, stage).toBeTruthy();
  }
  expect(Object.keys(PROJECT_STAGES)).toHaveLength(PROJECT_STAGE_ORDER.length);
});

// "Buttons vs badges" (crm-ui-redesign.md, 2026-10-05): each badge tone has one
// meaning. A stage is where the job is, so an open stage is "happening now" and
// only Đã đóng is "done". This replaces the plan-00 phase colouring, which
// painted Quyết toán as finished and Hợp đồng as waiting — a colour that lies.
test("open stages read 'happening now', only Đã đóng reads 'done'", () => {
  for (const stage of PROJECT_STAGE_ORDER) {
    expect(PROJECT_STAGES[stage].variant, stage).toBe(
      stage === ProjectStage.CLOSED ? "success" : "default"
    );
  }
});

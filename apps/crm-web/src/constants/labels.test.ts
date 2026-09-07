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

// The finding this guards (plan 00): 5 of the 8 stages rendered as the same
// solid-black pill, on non-adjacent stages, so the column grouped unrelated
// stages. Colour must move forward with the pipeline and never go back.
test("stage colour is monotonic along the pipeline", () => {
  const rank = { secondary: 0, warning: 1, default: 2, success: 3 } as const;
  const ranks = PROJECT_STAGE_ORDER.map((s) => {
    const variant = PROJECT_STAGES[s].variant as keyof typeof rank;
    expect(variant, `${s} uses an unranked variant`).toBeDefined();
    expect(rank[variant], `${s}: ${variant}`).toBeDefined();
    return rank[variant];
  });
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  expect(new Set(ranks).size).toBeGreaterThanOrEqual(4);
});

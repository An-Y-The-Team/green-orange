import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { PROJECT_STAGES } from "@/constants/labels";

import { advanceStage, expect, stepperButton, test } from "./fixtures";

/**
 * Manual stage moves are SOFT — no gates, forward or back
 * (crm-business-flow.md, 2026-07-24) — and a backward move keeps the data
 * entered in later stages. This also proves the write seam end to end: server
 * action → API → `revalidatePath` → re-rendered panel.
 *
 * Project 1 (báo giá) is reserved for this — no other spec asserts its stage.
 * The test moves it forward and then back, so it leaves the dataset as it found
 * it and can be re-run without a re-seed. It has to be an ACTIVE job: the
 * stepper hides both buttons on a hoãn/hủy one (project 9 is the parked
 * fixture), which reads as a missing button, not a failed rule.
 */
test("advancing a stage re-renders the panel, and going back restores it", async ({
  page,
}) => {
  await page.goto("/projects/1");
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();

  await advanceStage(page, PROJECT_STAGES[ProjectStage.CONTRACT].label);
  await expect(page.locator(`#stage-${ProjectStage.CONTRACT}`)).toBeVisible();

  // Backward is the plain button: the dialog it used to have was asking
  // permission for the harmless direction (later-stage data is kept).
  const prev = PROJECT_STAGES[ProjectStage.QUOTE].label;
  await stepperButton(page, `← ${prev}`).click();
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();
});

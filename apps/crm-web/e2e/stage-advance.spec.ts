import { expect, test } from "@playwright/test";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { PROJECT_STAGES } from "@/constants/labels";

/**
 * The only spec that writes to a seeded row, and the only one that proves the
 * whole seam works: server action → API → `revalidatePath` → re-rendered panel.
 *
 * Project 1 (báo giá) is reserved for this — no other spec asserts its stage.
 * The test moves it forward and then back, so it leaves the dataset as it found
 * it and can be re-run without a re-seed. It has to be an ACTIVE job: the
 * stepper hides both buttons on a hoãn/hủy one (project 9 is the parked
 * fixture), which reads as a missing button, not a failed rule.
 */

// The stepper renders a mobile pill and a desktop rail, both in the DOM — only
// one is visible at any viewport, so every button lookup filters on visibility.
const stepperButton = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name }).filter({ visible: true });

test("advancing a stage re-renders the panel, and going back restores it", async ({
  page,
}) => {
  await page.goto("/projects/1");
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();

  const next = PROJECT_STAGES[ProjectStage.CONTRACT].label;
  await stepperButton(page, `Chuyển sang: ${next}`).click();
  await expect(page.locator(`#stage-${ProjectStage.CONTRACT}`)).toBeVisible();

  const prev = PROJECT_STAGES[ProjectStage.QUOTE].label;
  await stepperButton(page, `← ${prev}`).click();
  // Backward moves are confirm-gated.
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();
});

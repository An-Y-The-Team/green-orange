import { expect, test } from "@playwright/test";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { PROJECT_STAGES } from "@/constants/labels";

/**
 * The stage panel is a switch on `project.stage`; an unknown value used to fall
 * out of it as `undefined` and crash React. One seeded công trình per stage
 * (apps/crm-api-nest/src/seed.ts, stable ids) walks every branch of it.
 *
 * Project 1 is deliberately absent — stage-advance.spec.ts moves that one. Its
 * stage (báo giá) is covered by 9, the parked job, instead.
 */
const SEEDED: [number, ProjectStage][] = [
  [4, ProjectStage.REQUEST],
  [9, ProjectStage.QUOTE],
  [5, ProjectStage.CONTRACT],
  [6, ProjectStage.PAPERWORK],
  [2, ProjectStage.EXECUTION],
  [7, ProjectStage.ACCEPTANCE],
  [8, ProjectStage.SETTLEMENT],
  [3, ProjectStage.CLOSED],
];

for (const [id, stage] of SEEDED) {
  test(`/projects/${id} renders the ${stage} panel`, async ({ page }) => {
    await page.goto(`/projects/${id}`);

    // `#stage-<stage>` is the panel's own anchor id (stage-card.tsx), so this
    // alone asserts the panel that rendered matches the stage the project is
    // in. Not its header text: the paperwork panel writes its own ("Hồ sơ
    // (n/m đã duyệt)") instead of the shared "Giai đoạn N · label".
    await expect(page.locator(`#stage-${stage}`)).toBeVisible();
    // The stage rail always names the current stage, whatever the panel says.
    // `visible` because the rail renders twice — a mobile pill and a desktop
    // row — and only one of them is on screen at any viewport.
    await expect(
      page
        .getByText(PROJECT_STAGES[stage].label)
        .filter({ visible: true })
        .first()
    ).toBeVisible();

    // The switch's fallback — reached only when the UI doesn't know the stage.
    await expect(page.getByText("Giai đoạn này chưa được hỗ trợ")).toHaveCount(
      0
    );
  });
}

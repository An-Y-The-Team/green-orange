import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { displayDay, expect, isoDay, stepperButton, test } from "./fixtures";

/**
 * Status is orthogonal to stage: hoãn freezes the công trình *where it is*, so
 * reports can show where jobs are lost, and it carries a follow-up date "so
 * parked jobs resurface instead of being forgotten"
 * (crm-business-flow.md §Project status).
 *
 * Three things have to hold together for that to be true, and they live in
 * three different files: the stage doesn't move, the stepper stops offering to
 * move it, and the dashboard picks the job back up on the follow-up date.
 */
test("hoãn freezes the stage and resurfaces the job on the dashboard", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.QUOTE });
  await page.goto(`/projects/${project.id}`);
  await expect(stepperButton(page, /^Chuyển sang:/).first()).toBeVisible();

  await page.getByRole("button", { name: "Hoãn", exact: true }).click();
  await page.getByLabel("Hẹn liên hệ lại").fill(displayDay(isoDay()));
  await page.getByRole("button", { name: "Xác nhận hoãn" }).click();

  // Frozen at Báo giá — the stage is where the job died, not a "lost" stage.
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();
  // …and a frozen job cannot be advanced until it is reactivated.
  await expect(stepperButton(page, /^Chuyển sang:/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Kích hoạt lại" })
  ).toBeVisible();

  // Follow-up date is today ⇒ it is back on the boss's desk this morning.
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: new RegExp(project.code) })
  ).toBeVisible();
});

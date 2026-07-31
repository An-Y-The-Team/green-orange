import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { PROJECT_STAGES } from "@/constants/labels";

import { expect, stepperButton, test } from "./fixtures";

/**
 * The spine of the pipeline, stages 2 → 4, as one flow
 * (docs/features/crm-business-flow.md §"Cross-entity rules"):
 *
 *   quote attached          ⇒ project auto-advances to Báo giá
 *   quote sent → Chốt       ⇒ stage-3 checklist row "Báo giá đã chốt" ticks
 *   khách ký + cọc received ⇒ stage 3 closes: auto-advance to Chuẩn bị hồ sơ
 *
 * Two of those three are backend side effects with no button of their own —
 * nothing in the UI says "advance now", the page just comes back on a different
 * stage. That is precisely what breaks silently.
 */
test("a quote drives a công trình from Báo giá to Chuẩn bị hồ sơ", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.REQUEST });

  // Attaching a quote auto-advances the project to Báo giá (stage 2).
  const quote = await api.createQuote(project.id, 10_000_000);
  await page.goto(`/projects/${project.id}`);
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();

  // A draft has no decision buttons — the client has to have been sent it.
  await api.sendQuote(quote.id);
  await page.reload();
  await page.getByRole("button", { name: /^Chốt/ }).click();
  await expect(page.getByText("Báo giá đã chốt —")).toBeVisible();

  // Chốt does NOT move the stage on its own: transitions are soft, the operator
  // moves. (The business doc calls this a gate; the backend implements it as a
  // manual move — if that ever changes, this line is where it shows.)
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toBeVisible();
  await stepperButton(
    page,
    `Chuyển sang: ${PROJECT_STAGES[ProjectStage.CONTRACT].label}`
  ).click();
  await expect(page.locator(`#stage-${ProjectStage.CONTRACT}`)).toBeVisible();

  // Stage 3's exit is a two-item checklist, independent of a written contract.
  await expect(page.getByText("Điều kiện hoàn thành")).toBeVisible();
  await expect(page.getByText("Chưa có báo giá chốt")).toHaveCount(0);

  await page.getByRole("button", { name: "Ghi nhận đã ký" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  // The button is gone once the date is stamped — that IS the checklist tick.
  await expect(
    page.getByRole("button", { name: "Ghi nhận đã ký" })
  ).toHaveCount(0);

  // Cọc = the `tam_ung` milestone. Recording it closes stage 3, and the project
  // comes back on stage 4 without anyone asking it to.
  await page.getByRole("button", { name: "Ghi nhận cọc" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.locator(`#stage-${ProjectStage.PAPERWORK}`)).toBeVisible();
});

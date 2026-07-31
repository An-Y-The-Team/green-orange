import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { expect, test } from "./fixtures";

/**
 * Auto-advance is `stage = max(stage, target)`, never a plain assignment
 * (crm-business-flow.md, 2026-07-24). Late paperwork on a running job — a
 * back-filled quote, a contract attached after the fact — must not drag the
 * công trình back to an earlier stage.
 *
 * A regression here is invisible until someone's Thi công job is sitting in Báo
 * giá on Monday, so it gets its own spec rather than a line in another flow.
 */
test("a quote attached late never pulls a running job back to Báo giá", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.EXECUTION });

  // Same call that advances a stage-1 project to Báo giá (flow-quote-to-paperwork).
  await api.createQuote(project.id, 5_000_000);

  await page.goto(`/projects/${project.id}`);
  await expect(page.locator(`#stage-${ProjectStage.EXECUTION}`)).toBeVisible();
  await expect(page.locator(`#stage-${ProjectStage.QUOTE}`)).toHaveCount(0);
});

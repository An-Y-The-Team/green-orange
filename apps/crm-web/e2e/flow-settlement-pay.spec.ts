import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { expect, test } from "./fixtures";

/**
 * Money safety on the project page: the bill's one-click "Đã thu" is gone, only
 * the next đợt carries a pay button, and its confirm names the amount. Paying
 * the last đợt warns that the project closes.
 */
test("thu tiền pays đợt in order, warns on the last, then closes", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.SETTLEMENT });
  await api.createSignedSettlement({
    projectId: project.id,
    amount: 10_000_000,
    deposit: 3_000_000,
  });
  await page.goto(`/projects/${project.id}`);

  await expect(
    page.getByRole("button", { name: "Đã thu", exact: true })
  ).toHaveCount(0);
  const pay = page.getByRole("button", { name: "Khách đã chuyển tiền…" });
  await expect(pay).toHaveCount(1);

  // Đợt 1 (cọc): not the last, so no closing warning.
  await pay.click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Đây là đợt cuối")).toHaveCount(0);
  await dialog.getByRole("button", { name: /^Đã nhận / }).click();

  // The button moves to the remaining đợt, which is the last.
  await expect(page.getByText(/Đã thu \d/).first()).toBeVisible();
  await expect(pay).toHaveCount(1);
  await pay.click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Đây là đợt cuối")).toBeVisible();
  await dialog.getByRole("button", { name: /^Đã nhận / }).click();

  await expect(page.getByText("Đã đóng").first()).toBeVisible();
});

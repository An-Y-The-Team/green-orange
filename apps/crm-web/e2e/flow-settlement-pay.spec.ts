import type { Locator, Page } from "@playwright/test";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { expect, test } from "./fixtures";

/**
 * Confirm a payment, wait for its server action to land, then reload. Same
 * app-bug-candidate workaround as flow-acceptance.spec.ts: in the production
 * build the revalidated tree is not applied until a reload. Drop the reload
 * once that is fixed.
 */
async function confirmPayment(page: Page, confirm: Locator) {
  const written = page.waitForResponse((r) => r.request().method() === "POST");
  await confirm.click();
  await written;
  await page.reload();
}

/**
 * Money safety on the project page: the bill's one-click "Đã thu" is gone, only
 * the next đợt carries a pay button, and its confirm names the amount. Paying
 * the last đợt warns that the project closes, and it does close.
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
  const paidBadge = page.getByText(/^Đã thu \d{2}\/\d{2}\/\d{4}$/);
  await expect(pay).toHaveCount(1);
  await expect(paidBadge).toHaveCount(0);

  // Đợt 1 (cọc): not the last, so no closing warning.
  await pay.click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Đây là đợt cuối")).toHaveCount(0);
  await confirmPayment(page, dialog.getByRole("button", { name: /^Đã nhận / }));

  // Đợt 1 now carries its paid date; the button moved to the last đợt.
  await expect(paidBadge).toHaveCount(1);
  await expect(pay).toHaveCount(1);
  await pay.click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Đây là đợt cuối")).toBeVisible();
  await confirmPayment(page, dialog.getByRole("button", { name: /^Đã nhận / }));

  // The server closed the project: the closed panel replaces Quyết toán.
  await expect(page.locator(`#stage-${ProjectStage.CLOSED}`)).toBeVisible();
  await expect(page.getByText(/^✓ Hoàn thành/)).toBeVisible();
});

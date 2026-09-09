import { expect, test } from "@playwright/test";

/**
 * The write path a create page takes: react-hook-form → server action →
 * redirect → the list re-reads the API. A unique name per run means this never
 * collides with itself or with the seeded rows, so no reset is needed.
 *
 * The row is found through the list's own search box: /clients pages at 20
 * rows sorted by name, so a freshly created client is only on page 1 by
 * accident, and the rows every run leaves behind eventually push it off.
 */
test("creating a client shows it on the list", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Công ty ${stamp}`;

  await page.goto("/clients/new");
  await page.getByLabel("Tên khách hàng").fill(name);
  await page.getByLabel("Email").fill(`e2e-${stamp}@example.com`);
  await page.getByRole("button", { name: "Tạo khách hàng" }).click();

  await expect(page).toHaveURL(/\/clients$/);
  await page.getByPlaceholder("Tìm tên, MST…").fill(name);
  // The row, not any text: the success toast carries the name too, and it is
  // still on screen when the list arrives.
  await expect(page.getByRole("link", { name })).toBeVisible();
});

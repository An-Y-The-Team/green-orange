import { expect, test } from "@playwright/test";

/**
 * The write path a create page takes: react-hook-form → server action →
 * redirect → the list re-reads the API. A unique name per run means this never
 * collides with itself or with the seeded rows, so no reset is needed.
 *
 * ponytail: the rows it leaves behind are harmless until /clients outgrows its
 * 100-row first page — then either delete `E2E …` clients or give the list a
 * server-side search.
 */
test("creating a client shows it on the list", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Công ty ${stamp}`;

  await page.goto("/clients/new");
  await page.getByLabel("Tên khách hàng").fill(name);
  await page.getByLabel("Email").fill(`e2e-${stamp}@example.com`);
  await page.getByRole("button", { name: "Tạo khách hàng" }).click();

  await expect(page).toHaveURL(/\/clients$/);
  // The row, not any text: the success toast carries the name too, and it is
  // still on screen when the list arrives.
  await expect(page.getByRole("link", { name })).toBeVisible();
});

import { expect, test } from "@playwright/test";

/**
 * Print routes are pure render over data fetched three levels down, have no
 * interaction to smoke-test them, and are the pages a customer actually sees.
 * They break silently — hence one assertion that the document has a body.
 */
test("the quote print sheet renders its line items", async ({ page }) => {
  await page.goto("/quotes/1/print");
  await expect(page.getByText("BÁO GIÁ DỊCH VỤ")).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

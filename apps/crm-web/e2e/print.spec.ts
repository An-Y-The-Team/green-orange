import { expect, test } from "@playwright/test";

import { DOCUMENT_TEXT } from "@/constants/labels";

/**
 * Print routes are pure render over data fetched three levels down, have no
 * interaction to smoke-test them, and are the pages a customer actually sees.
 * They break silently — hence one assertion that the document has a body.
 */
test("the quote print sheet renders its line items", async ({ page }) => {
  await page.goto("/quotes/1/print");
  // By role, not text: the sheet's closing clause ("Bảng báo giá được lập thành
  // 02 bản…") also contains the heading, case-insensitively.
  await expect(
    page.getByRole("heading", { name: DOCUMENT_TEXT.quoteHeading })
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

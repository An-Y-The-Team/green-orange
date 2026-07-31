import { expect, test } from "@playwright/test";

/**
 * The guard for the failure mode this app degrades into rather than errors on:
 * `apiFetchSafe` turns a failed list read into `[]`, so a wrong or broken
 * backend renders EMPTY pages, not error pages (AGENTS.md). No unit test can
 * see that. Every list page must show at least one seeded row.
 */
const LIST_PAGES = [
  { path: "/projects", heading: "Công trình" },
  { path: "/clients", heading: "Khách hàng" },
  { path: "/quotes", heading: "Báo giá" },
  { path: "/contracts", heading: "Hợp đồng" },
  { path: "/crew", heading: "Nhân sự" },
  { path: "/receivables", heading: "Thu & công nợ" },
];

for (const { path, heading } of LIST_PAGES) {
  test(`${path} renders seeded rows`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    // Deliberately not a row count: totals make specs order-dependent and would
    // break the moment another spec creates a row.
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
}

test("/dashboard renders seeded panels", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
  // Panels, not tables — a công trình code link is this page's "row".
  await expect(
    page.getByRole("link", { name: /CT-\d{4}-\d{3}/ }).first()
  ).toBeVisible();
});

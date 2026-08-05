import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { expect, test } from "./fixtures";

/**
 * Search & Filter on the list pages (F17 wave 2): state lives in the URL
 * (usePageParams), rows come from /api/crm/* server-side filtering. What must
 * hold: typing/filtering narrows to matching rows, the URL round-trips on
 * reload (`.claude/code-review.md` URL-state rule), sort is server-side, and
 * paging past the result set is impossible.
 *
 * Rows are isolated by unique names (parallel specs create their own
 * projects), never by counts. The 300ms search debounce is absorbed by
 * auto-waiting `expect(locator)` — no fixed sleeps.
 */

const search = (page: import("@playwright/test").Page) =>
  // One search box per list page; the placeholder varies ("Tìm mã, tên…").
  page.getByRole("searchbox");

test("/projects search narrows rows and survives a reload", async ({
  page,
  api,
}) => {
  const alpha = await api.createProject({
    name: `E2E Search Alpha ${Date.now()}`,
  });
  const beta = await api.createProject({
    name: `E2E Search Beta ${Date.now()}`,
  });

  await page.goto("/projects");
  await search(page).fill(alpha.code);
  await expect(page.getByRole("cell", { name: alpha.code })).toBeVisible();
  await expect(page.getByRole("cell", { name: beta.code })).toBeHidden();
  await expect(page).toHaveURL(/search=/);

  // The URL is the state: a reload restores both the input and the rows.
  await page.reload();
  await expect(search(page)).toHaveValue(alpha.code);
  await expect(page.getByRole("cell", { name: alpha.code })).toBeVisible();
  await expect(page.getByRole("cell", { name: beta.code })).toBeHidden();
});

test("/projects stage multi-filter keeps matching stages only", async ({
  page,
  api,
}) => {
  const quote = await api.createProject({ stage: ProjectStage.QUOTE });
  const request = await api.createProject({ stage: ProjectStage.REQUEST });

  await page.goto("/projects");
  await page.getByRole("combobox", { name: "Giai đoạn" }).click();
  await page.getByRole("option", { name: "Báo giá" }).click();
  // Multi-select stays open for more picks — pick a second stage, then close.
  await page.getByRole("option", { name: "Hợp đồng" }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("cell", { name: quote.code })).toBeVisible();
  await expect(page.getByRole("cell", { name: request.code })).toBeHidden();
  await expect(page).toHaveURL(/stage=/);
});

test("/projects sort by Mã is server-side and toggles direction", async ({
  page,
}) => {
  await page.goto("/projects");
  // Inactive header sorts desc first; second click flips to asc.
  await page.getByRole("button", { name: "Mã" }).click();
  await expect(page).toHaveURL(/sortBy=code/);
  const firstDesc = await page
    .locator("tbody tr")
    .first()
    .locator("td")
    .first()
    .innerText();

  await page.getByRole("button", { name: "Mã" }).click();
  // Codes are CT-YYYY-NNN and the seed starts at 001 — asc puts it first,
  // whatever other specs have created since.
  await expect(
    page.locator("tbody tr").first().locator("td").first()
  ).not.toHaveText(firstDesc);
  await expect(page.locator("tbody tr").first()).toContainText("CT-2026-001");
});

test("/projects pagination pages a filtered result set", async ({
  page,
  api,
}) => {
  // 11 rows under one unique prefix → limit 10 gives exactly 2 pages,
  // independent of what parallel specs create.
  const prefix = `E2E Page ${Date.now()}`;
  for (let i = 0; i < 11; i++) {
    await api.createProject({ name: `${prefix} ${i}` });
  }

  await page.goto("/projects");
  await search(page).fill(prefix);
  // Unfiltered page 1 can ALSO hold exactly 10 rows, so a row count can pass
  // before the 300ms debounce lands — the URL only changes when it has.
  await expect(page).toHaveURL(/search=/);
  await page.getByLabel("Mỗi trang").selectOption("10");
  await expect(page.locator("tbody tr")).toHaveCount(10);

  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page).toHaveURL(/page=2/);

  // Page 2 of 2 — the pager must refuse to go further.
  await expect(page.getByRole("button", { name: "Trang sau" })).toBeDisabled();
});

// One search smoke per remaining page, against stable seeded rows.
test("/clients search finds a seeded client", async ({ page }) => {
  await page.goto("/clients");
  await search(page).fill("An Phát");
  await expect(
    page.getByRole("cell", { name: /Công ty TNHH An Phát/ })
  ).toBeVisible();
  await expect(page).toHaveURL(/search=/);
});

test("/crew search finds a seeded member by name", async ({ page }) => {
  await page.goto("/crew");
  await search(page).fill("Bảo");
  await expect(page.getByRole("cell", { name: /Trần Quốc Bảo/ })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Nguyễn Minh Khoa/ })
  ).toBeHidden();
});

test("/quotes search reaches through the project relation", async ({
  page,
}) => {
  await page.goto("/quotes");
  await search(page).fill("CT-2026-003");
  await expect(
    page.getByRole("cell", { name: /CT-2026-003/ }).first()
  ).toBeVisible();
  await expect(page).toHaveURL(/search=/);
});

import { expect, test } from "@playwright/test";

/**
 * The inline "tạo nhanh khách hàng" block on /projects/new writes up to three
 * rows — client, contact, địa điểm — before the công trình it exists to open.
 *
 * Người liên hệ is optional the whole way down: a walk-in company and its site
 * open a công trình on their own, and both backends store null contacts for it
 * (nobody has been named yet). This walks that seam end to end.
 */
test("quick-create files a client with no người liên hệ", async ({ page }) => {
  const stamp = Date.now();

  await page.goto("/projects/new");
  await page.getByRole("button", { name: "+ Thêm khách hàng mới" }).click();

  // Required first, then what is filled in when known.
  const panel = page.locator("#qc-name").locator("xpath=../..");
  expect(
    (await panel.locator("label").allInnerTexts()).map((t) =>
      t.replace(/\s*\*$/, "").trim()
    )
  ).toEqual([
    "Tên khách hàng / cty",
    "Loại khách hàng",
    "Tên toà nhà thi công",
    "Địa điểm/Địa chỉ thi công",
    "Mã số thuế",
    "Địa chỉ trụ sở",
    "Người liên hệ",
    "Số điện thoại liên hệ",
  ]);

  await page.locator("#qc-name").fill(`E2E KhongLienHe ${stamp}`);
  await page.locator("#qc-location-name").fill("Toà nhà B");
  await page.locator("#qc-location-address").fill("9 Lê Lợi, Quận 1");

  // A phone with no name IS refused — the API keys a contact by name, so the
  // number would be dropped on the floor.
  await page.locator("#qc-contact-phone").fill("0901234567");
  await page.getByRole("button", { name: "Tạo khách hàng" }).click();
  await expect(
    page.getByText("Nhập tên người liên hệ đi kèm số điện thoại.")
  ).toBeVisible();

  await page.locator("#qc-contact-phone").fill("");
  await page.getByRole("button", { name: "Tạo khách hàng" }).click();

  // The site is pre-selected; the contact select is simply empty.
  await expect(
    page.getByRole("combobox").filter({ hasText: "Toà nhà B" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Vệ sinh", exact: true }).click();
  await page.getByLabel("Tên công trình").fill(`E2E KhongLienHe ${stamp}`);
  await page.getByRole("button", { name: "Tạo công trình" }).click();
  await expect(page).toHaveURL(/\/projects\/\d+$/);
  await expect(
    page.getByRole("heading", { name: `E2E KhongLienHe ${stamp}` })
  ).toBeVisible();

  // The workspace is where one gets attached later — its edit form offers the
  // empty slot rather than silently picking somebody.
  await page.getByRole("button", { name: "Sửa" }).click();
  await expect(page.locator("#working-contact")).toHaveValue("");
});

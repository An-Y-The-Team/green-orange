import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  COVER,
  PRICED,
  SETTLED,
  fillTemplate,
} from "@/app/(dashboard)/projects/import/utils/parse-quote-workbook/test-fixtures";

/**
 * "Nhập từ báo giá": the operators' own workbook → công trình, with no other
 * input when everything matches. Two files in one drop:
 *
 * - a job for the SEEDED client (Công ty TNHH An Phát, MST 0312345678) at its
 *   seeded site — both must be reused, not duplicated;
 * - a settled job for a brand-new client — lands at Quyết toán with its quyết
 *   toán already prepared.
 *
 * Re-dropping the first file then warns about the duplicate.
 */
test("two workbooks → two công trình, existing client reused", async ({
  page,
}, testInfo) => {
  const stamp = Date.now();
  const existing = testInfo.outputPath(`bg-an-phat-${stamp}.xlsx`);
  const settled = testInfo.outputPath(`bg-moi-${stamp}.xlsx`);
  await writeFile(
    existing,
    await fillTemplate({
      sheet1: {
        ...COVER,
        B4: `Công trình: E2E An Phát ${stamp}`,
        B6: "Công việc: Vệ sinh",
        B8: "Địa chỉ: 12 Nguyễn Huệ, Quận 1, TP.HCM",
        C18: "Công ty TNHH An Phát",
        B22: "Mã số thuế: 0312345678",
      },
      sheet2: PRICED,
    })
  );
  await writeFile(
    settled,
    await fillTemplate({
      sheet1: {
        ...COVER,
        B4: `Công trình: E2E Khách mới ${stamp}`,
        C18: `CÔNG TY E2E ${stamp}`,
        B22: `Mã số thuế: ${String(stamp).slice(-10)}`,
      },
      sheet2: PRICED,
      sheet4: SETTLED,
    })
  );

  await page.goto("/projects");
  // A Button rendered as a Link keeps role="button".
  await page.getByRole("button", { name: "Nhập từ báo giá" }).click();
  await expect(page).toHaveURL(/\/projects\/import$/);

  await page.locator("#quote-workbooks").setInputFiles([existing, settled]);

  const anPhat = page.locator('[data-slot="card"]', {
    hasText: `E2E An Phát ${stamp}`,
  });
  const moi = page.locator('[data-slot="card"]', {
    hasText: `E2E Khách mới ${stamp}`,
  });
  await expect(anPhat.getByText("Khách có sẵn")).toBeVisible();
  await expect(anPhat.getByText("Có sẵn: Toà nhà A — Q.1")).toBeVisible();
  await expect(
    moi.getByText(`Sẽ tạo khách mới: CÔNG TY E2E ${stamp}`)
  ).toBeVisible();
  // Read from the quyết toán sheet, not chosen by hand.
  await expect(moi.getByLabel("Giai đoạn")).toHaveValue("settlement");
  await expect(anPhat.getByText("Sẵn sàng")).toBeVisible();
  await expect(moi.getByText("Sẵn sàng")).toBeVisible();

  await page.getByRole("button", { name: "Tạo 2 công trình" }).click();

  const created = moi.getByRole("link", {
    name: /CT-\d{4}-\d+ · E2E Khách mới/,
  });
  await expect(created).toBeVisible();
  await expect(
    anPhat.getByRole("link", { name: /CT-\d{4}-\d+ · E2E An Phát/ })
  ).toBeVisible();

  // Same file again: the client now has a công trình of that name.
  await page.locator("#quote-workbooks").setInputFiles(existing);
  await expect(
    page.getByText(/đã có công trình cùng tên: CT-\d{4}-\d+/)
  ).toBeVisible();

  await created.click();
  await expect(page).toHaveURL(/\/projects\/\d+$/);
  await expect(
    page.getByRole("heading", { name: `E2E Khách mới ${stamp}` })
  ).toBeVisible();
});

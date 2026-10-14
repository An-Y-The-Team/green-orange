import type { Locator, Page } from "@playwright/test";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { displayDay, expect, isoDay, test } from "./fixtures";

/**
 * Click a step button, wait for its server action to land, then reload.
 * app-bug-candidate: after these actions succeed (200, row written) the
 * client never applies the revalidated tree and stays "pending", so the
 * panel is stale until a reload. Drop the reload once that is fixed.
 */
async function act(page: Page, button: Locator) {
  const written = page.waitForResponse((r) => r.request().method() === "POST");
  await button.click();
  await written;
  await page.reload();
}

/**
 * Nghiệm thu is a 3-step stepper: hẹn ngày → thực hiện (Đạt, or báo lỗi and
 * sửa, any number of times) → biên bản đã ký & hoàn tất. Each click writes a
 * history line, readable in the "In thư · Giấy tờ · Lịch sử" drawer.
 */
test("nghiệm thu walks hẹn ngày → báo lỗi → sửa → Đạt → quay lại → hoàn tất", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.ACCEPTANCE });
  await page.goto(`/projects/${project.id}`);
  await page.waitForLoadState("networkidle");

  // Bước 1: the date is required.
  const schedule = page.getByRole("button", { name: "Khách đã hẹn lịch" });
  await expect(schedule).toBeDisabled();
  await page
    .getByLabel("Ngày khách hẹn nghiệm thu")
    .fill(displayDay(isoDay(3)));
  await expect(schedule).toBeEnabled();
  await act(page, schedule);

  // Bước 2: báo lỗi needs a note.
  await expect(
    page.getByText(`Ngày hẹn: ${displayDay(isoDay(3))}`).first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Khách báo lỗi, cần sửa…" }).click();
  const save = page.getByRole("button", { name: "Lưu và chuyển sang sửa lỗi" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Khách phản ánh gì (bắt buộc)").fill("Ố kính tầng 15");
  await act(page, save);

  await expect(page.getByText("Đang sửa lỗi · lần 1")).toBeVisible();
  await act(
    page,
    page.getByRole("button", { name: "Đã sửa xong, nghiệm thu lại" })
  );

  const agreed = page.getByRole("button", { name: "Nghiệm thu Đạt" });
  await act(page, agreed);

  // Bước 3, then undo, then Đạt again.
  await act(page, page.getByRole("button", { name: "Quay lại", exact: true }));
  await act(page, agreed);

  // No signed minutes attached: the confirm warns but lets it through.
  await page.getByRole("button", { name: "Hoàn tất nghiệm thu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Chưa có biên bản đã ký.")).toBeVisible();
  await act(page, dialog.getByRole("button", { name: "Hoàn tất nghiệm thu" }));

  await expect(page.getByText("Nghiệm thu xong ngày")).toBeVisible();

  // The drawer on the (now past) Nghiệm thu view keeps the whole log.
  await page.getByRole("link", { name: "Xem lại Nghiệm thu" }).click();
  await page.getByText("In thư · Giấy tờ · Lịch sử").click();
  for (const line of [
    "Khách hẹn nghiệm thu",
    "Ố kính tầng 15",
    "Đã sửa xong, nghiệm thu lại",
    "Quay lại Thực hiện Nghiệm thu",
    "Hoàn tất nghiệm thu",
  ]) {
    await expect(
      page.getByRole("listitem").filter({ hasText: line }).first()
    ).toBeVisible();
  }
});

import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { expect, test } from "./fixtures";

/**
 * Stage 4 is a per-project checklist, not a form: every new công trình is
 * seeded with the four common requirements, and each item walks
 * chưa xong → đã nộp → đã duyệt one way (crm-business-flow.md §4 + §Paperwork
 * item). The header counter is the stage's progress readout, so it has to agree
 * with the rows underneath it.
 */
test("a hồ sơ item walks chưa xong → đã nộp → đã duyệt, once", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.PAPERWORK });
  await page.goto(`/projects/${project.id}`);

  // Seeded on create: giấy phép thi công, PCCC, danh sách nhân sự, thiết bị.
  await expect(page.getByText("Hồ sơ (0/4 đã duyệt)")).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "Giấy phép thi công" });

  await row.getByRole("button", { name: "→ Đã nộp" }).click();
  await expect(row.getByRole("button", { name: "→ Đã duyệt" })).toBeVisible();
  await expect(page.getByText("Hồ sơ (0/4 đã duyệt)")).toBeVisible();

  await row.getByRole("button", { name: "→ Đã duyệt" }).click();
  await expect(page.getByText("Hồ sơ (1/4 đã duyệt)")).toBeVisible();
  // Đã duyệt is terminal — no way further, and no way back.
  await expect(row.getByRole("button", { name: /^→/ })).toHaveCount(0);

  // Requirements vary per site, so operators add their own items.
  await page.getByPlaceholder("Tên hồ sơ mới…").fill("Giấy ra vào tòa nhà");
  await page.getByRole("button", { name: "Thêm mục" }).click();
  await expect(page.getByText("Hồ sơ (1/5 đã duyệt)")).toBeVisible();
});

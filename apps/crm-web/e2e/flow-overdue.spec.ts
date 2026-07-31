import { expect, isoDay, test } from "./fixtures";

/**
 * "Quá hạn is not stored — it's derived (due date passed and not đã thu), so it
 * can never disagree with the calendar" (crm-business-flow.md §Payment
 * milestone). The status column therefore has to show Quá hạn for a past-due
 * đợt that was never touched, and stop showing it the moment the money lands —
 * with no status write in between.
 *
 * The tempting regression is caching a boolean at write time; that passes every
 * unit test and is wrong the next morning.
 */
test("a past-due đợt reads Quá hạn until it is collected", async ({
  page,
  api,
}) => {
  const project = await api.createProject();
  await api.createMilestone({
    projectId: project.id,
    amount: 4_000_000,
    dueDate: isoDay(-3), // due three days ago, never collected
  });

  await page.goto("/receivables");
  const row = page.getByRole("row").filter({ hasText: project.code });
  await expect(row).toContainText("Quá hạn");

  await row.getByRole("button", { name: "Ghi nhận đã thu" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();

  await expect(row).toContainText("Đã thu");
  await expect(row).not.toContainText("Quá hạn");
});

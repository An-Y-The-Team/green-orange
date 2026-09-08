import { ProjectStage } from "@/app/(dashboard)/projects/enums";

import { expect, test } from "./fixtures";

/**
 * The báo giá's "Điều khoản & ghi chú" block is rich text (a Lexical body) with
 * merge chips, authored in the builder and printed by the document renderer —
 * two different code paths over one stored string. Neither says anything when it
 * breaks: a body the renderer cannot read prints "(Chưa có nội dung)", and a
 * chip stored with a stale value prints the wrong figure. Hence one round trip:
 * author formatting + a chip, then read it back off the printable.
 */
test("the terms block round-trips formatting and a resolved chip", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.QUOTE });
  const quote = await api.createQuote(project.id, 10_000_000);

  await page.goto(`/quotes/${quote.id}`);
  const editor = page.getByRole("textbox", { name: "Điều khoản & ghi chú" });
  await editor.click();
  await editor.pressSequentially("Báo giá hiệu lực 30 ngày.");
  await editor.press("Enter");

  await page.getByRole("button", { name: "Danh sách", exact: true }).click();
  await editor.pressSequentially("Thanh toán qua TK ");

  // The chip is stored as a token and resolved at render — the value it shows
  // here comes from the company profile, not from anything typed.
  await page.getByText("Chèn", { exact: true }).click();
  await page.getByRole("button", { name: "Bên B: Số tài khoản" }).click();
  await expect(editor).toContainText("Thanh toán qua TK 0123456789");

  // Inserting closes the palette, which otherwise covers the save buttons.
  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByText("Lưu nháp")).toBeVisible();

  // The printable: the bullet survived, and the chip resolved on paper.
  await page.goto(`/quotes/${quote.id}/print`);
  await expect(page.getByText("Điều khoản & ghi chú:")).toBeVisible();
  await expect(page.getByRole("listitem")).toContainText(
    "Thanh toán qua TK 0123456789"
  );

  // Reopening re-seeds the editor from the stored body — formatting intact and
  // the chip re-resolved, not left as a bare token.
  await page.goto(`/quotes/${quote.id}`);
  await expect(
    page.getByRole("textbox", { name: "Điều khoản & ghi chú" })
  ).toContainText("Thanh toán qua TK 0123456789");
});

/**
 * Every báo giá written before the block became rich text holds plain text in
 * the same column. Feeding that to Lexical's `initialConfig.editorState` throws
 * at parse time — i.e. a blank page, not a degraded one — so the builder has to
 * migrate it on open. A frozen quote reuses the same builder, and a
 * `contentEditable` does not obey the disabled fieldset around it.
 */
test("a legacy plain-text note opens, and a sent quote's block is frozen", async ({
  page,
  api,
}) => {
  const project = await api.createProject({ stage: ProjectStage.QUOTE });
  const quote = await api.createQuote(
    project.id,
    5_000_000,
    "Hiệu lực 30 ngày.\nThanh toán trước 50%."
  );

  await page.goto(`/quotes/${quote.id}`);
  const editor = page.getByRole("textbox", { name: "Điều khoản & ghi chú" });
  await expect(editor).toContainText("Hiệu lực 30 ngày.");
  await expect(editor).toContainText("Thanh toán trước 50%.");

  await api.sendQuote(quote.id);
  await page.reload();
  const frozen = page.getByRole("textbox", { name: "Điều khoản & ghi chú" });
  await expect(frozen).toHaveAttribute("contenteditable", "false");
  await expect(page.getByRole("button", { name: "Đậm" })).toHaveCount(0);
});

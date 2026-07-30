import { expect, test } from "vitest";

import { doc, mf, p, t } from "@/utils/lexical-build/lexical-build";
import { previewContext } from "@/utils/merge-template/merge-template";

import { exportDocx } from "./docx-export";

// Only the refusal path is covered here: it is reached before any DOM access,
// whereas a successful export ends in document.createElement + a click, which
// needs a browser. The rule under test is the legal-document one — an
// unresolvable ⟨token?⟩ must never be packed into a customer-facing .docx.
const args = { title: "HỢP ĐỒNG", fileName: "hd.docx" };

test("refuses to write a .docx when a merge field cannot be resolved", async () => {
  const body = doc(p(t("Địa chỉ: "), mf("client_address")));

  await expect(
    exportDocx({ body, ctx: previewContext(), ...args })
  ).rejects.toThrow(/client_address/);
});

test("names every unresolved token, once each", async () => {
  const body = doc(
    p(mf("client_address"), mf("client_tax_code"), mf("client_address"))
  );

  await expect(
    exportDocx({ body, ctx: previewContext(), ...args })
  ).rejects.toThrow(
    "Không thể xuất .docx: các trường trộn sau chưa có dữ liệu ({{client_address}}, {{client_tax_code}}). Hãy sửa mẫu hợp đồng rồi thử lại."
  );
});

// ctx === null means "export the reusable template", where literal {{token}}
// placeholders ARE the deliverable — that path must not be refused.
test("a template export (ctx = null) is not refused for unknown tokens", async () => {
  const body = doc(p(mf("client_address")));

  // Fails later, at the DOM download step — proving it got past the token gate.
  await expect(exportDocx({ body, ctx: null, ...args })).rejects.not.toThrow(
    /trường trộn/
  );
});

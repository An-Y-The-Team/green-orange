import JSZip from "jszip";
import { expect, test, vi } from "vitest";

import {
  type LexNode,
  doc,
  mf,
  p,
  t,
} from "@/utils/lexical-build/lexical-build";
import { previewContext } from "@/utils/merge-template/merge-template";

import { exportDocx } from "./docx-export";

/** A .docx is a zip; its body markup lives in word/document.xml. */
const unzipDocumentXml = async (packed: Blob): Promise<string> => {
  const zip = await JSZip.loadAsync(await packed.arrayBuffer());
  return zip.file("word/document.xml")!.async("string");
};

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

// Block alignment is a Vietnamese-contract requirement, not a nicety: the
// Quốc hiệu is centred. It used to be dropped on export, so the .docx came out
// left-aligned. Packing happens before the DOM download step, so stubbing the
// two browser calls is enough to inspect the real file.
test("block alignment survives the .docx export", async () => {
  const align = (node: LexNode, format: string) => ({ ...node, format });
  const body = doc(
    p(t("Trái mặc định")),
    align(p(t("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")), "center"),
    align(p(t("Bên phải")), "right")
  );

  let packed: Blob | undefined;
  const url = globalThis.URL;
  vi.spyOn(url, "createObjectURL").mockImplementation((blob) => {
    packed = blob as Blob;
    return "blob:test";
  });
  vi.spyOn(url, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal("document", {
    createElement: () => ({ click() {}, href: "", download: "" }),
  });

  await exportDocx({ body, ctx: null, ...args });

  const xml = await unzipDocumentXml(packed!);
  const alignments = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
    .map((m) => m[0])
    .filter((para) => /<w:t[^>]*>[^<]/.test(para))
    .map((para) => /w:jc w:val="([a-z]+)"/.exec(para)?.[1] ?? "left");

  // [title, plain paragraph, centred, right]
  expect(alignments).toEqual(["center", "left", "center", "right"]);

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

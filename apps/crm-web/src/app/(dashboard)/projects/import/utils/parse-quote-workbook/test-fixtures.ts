// Test-only: filled copies of the operators' real workbook, for the parser's
// unit tests and the import e2e spec. Never imported by app code.
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The real, unfilled template operators work from — the parser must read it
 * as is, never a copy made for the CRM. Both vitest and Playwright run from
 * apps/crm-web (their package scripts), so the repo root is two levels up.
 */
export const TEMPLATE = path.resolve(
  process.cwd(),
  "../../01. MẪU FILE HỒ SƠ/Mẫu Báo giá - Nghiem thu - Quyet toan - DNTT.xlsx"
);

export type Cells = Record<string, string | number>;

/** sheet1 = Bia, sheet2 = Bang bao gia, sheet3 = nghiệm thu, sheet4 = quyết toán. */
export type Sheets = Partial<
  Record<"sheet1" | "sheet2" | "sheet3" | "sheet4", Cells>
>;

const xmlText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The template with some cells typed over, as an operator would — a typed
 * cell replaces the formula there too, like overtyping in Excel.
 */
export async function fillTemplate(sheets: Sheets): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await readFile(TEMPLATE));
  for (const [sheet, cells] of Object.entries(sheets)) {
    const file = `xl/worksheets/${sheet}.xml`;
    let xml = await zip.file(file)!.async("string");
    for (const [ref, value] of Object.entries(cells ?? {})) {
      const cell =
        typeof value === "number"
          ? `<c r="${ref}"><v>${value}</v></c>`
          : `<c r="${ref}" t="inlineStr"><is><t>${xmlText(value)}</t></is></c>`;
      const existing = new RegExp(`<c r="${ref}"[^>]*?(?:/>|>.*?</c>)`, "s");
      if (existing.test(xml)) {
        xml = xml.replace(existing, cell);
        continue;
      }
      const row = ref.replace(/\D/g, "");
      const open = new RegExp(`(<row r="${row}"[^>]*>.*?)(</row>)`, "s");
      if (!open.test(xml)) throw new Error(`row ${row} missing in ${sheet}`);
      xml = xml.replace(open, `$1${cell}$2`);
    }
    zip.file(file, xml);
  }
  return zip.generateAsync({ type: "uint8array" });
}

/** A filled-in Bia: every header field the import reads. */
export const COVER: Cells = {
  B4: "Công trình: Bread Talk",
  B5: "Mã số CT: 2026/07/15-BreadTalk",
  B6: "Công việc: Tháo dỡ/ Vệ sinh",
  B7: "Ngày: 15/07/2026",
  B8: "Địa chỉ: B3-15A, TTTM Vincom Center, 72 Lê Thánh Tôn",
  C18: "CÔNG TY CỔ PHẦN BÌNH MINH TOÀN CẦU",
  B19: "Đại diện bởi Bà: Trần Khánh Vân",
  B20: "Chức vụ: Phó Tổng Giám Đốc",
  B21: "Địa chỉ: 121 đường 10 Tây, Phường Tân Hưng",
  B22: "Mã số thuế:  0309554620",
  B23: "Điện thoại: +84 912 345 678",
};

/** Two priced lines in two sections; the rest left as the template has them. */
export const PRICED: Cells = {
  // I. 1.1 Bảo hiểm công trình
  D22: 1,
  E22: 2_000_000,
  F22: 2_000_000,
  // II. 2.1 Tháo trần thạch cao
  D25: 120,
  E25: 85_000,
  F25: 10_200_000,
  // Tổng cộng trước thuế, Giảm giá trước thuế
  F42: 12_200_000,
  F43: 200_000,
};

/** Quyết toán: Đơn giá D, Khối lượng thực tế G, Thành tiền thực tế H (row 27 = 1.2 Đóng hoarding). */
export const SETTLED: Cells = {
  D27: 150_000,
  G27: 40,
  H27: 6_000_000,
  H46: 6_000_000,
};

import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";
import { readXlsx } from "@/utils/read-xlsx/read-xlsx";

import { ProjectStage } from "../../../enums";
import { normalizePhone, parseQuoteWorkbook } from "./parse-quote-workbook";

// The real, unfilled template operators work from — the parser must read it
// as is, never a copy made for the CRM.
const TEMPLATE = new URL(
  "../../../../../../../../../01. MẪU FILE HỒ SƠ/Mẫu Báo giá - Nghiem thu - Quyet toan - DNTT.xlsx",
  import.meta.url
);

type Cells = Record<string, string | number>;

/**
 * The template with some cells typed over, as an operator would. Sheet files:
 * sheet1 = Bia, sheet2 = Bang bao gia, sheet3 = nghiệm thu, sheet4 = quyết toán.
 * A typed cell replaces the formula there too, like overtyping in Excel.
 */
async function filled(sheets: Record<string, Cells>) {
  const zip = await JSZip.loadAsync(await readFile(TEMPLATE));
  for (const [sheet, cells] of Object.entries(sheets)) {
    const path = `xl/worksheets/${sheet}.xml`;
    let xml = await zip.file(path)!.async("string");
    for (const [ref, value] of Object.entries(cells)) {
      const cell =
        typeof value === "number"
          ? `<c r="${ref}"><v>${value}</v></c>`
          : `<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
      const existing = new RegExp(`<c r="${ref}"[^>]*?(?:/>|>.*?</c>)`, "s");
      if (existing.test(xml)) xml = xml.replace(existing, cell);
      else {
        const row = ref.replace(/\D/g, "");
        const open = new RegExp(`(<row r="${row}"[^>]*>.*?)(</row>)`, "s");
        expect(open.test(xml), `row ${row} in ${sheet}`).toBe(true);
        xml = xml.replace(open, `$1${cell}$2`);
      }
    }
    zip.file(path, xml);
  }
  return parseQuoteWorkbook(
    await readXlsx(await zip.generateAsync({ type: "uint8array" }))
  );
}

const COVER: Cells = {
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

// Two priced lines in two sections, the rest left as the template has them.
const PRICED: Cells = {
  D22: 1,
  E22: 2_000_000,
  F22: 2_000_000, // I. 1.1 Bảo hiểm công trình
  D25: 120,
  E25: 85_000,
  F25: 10_200_000, // II. 2.1 Tháo trần thạch cao
  F42: 12_200_000,
  F43: 200_000,
};

test("the unfilled template names every field it is missing", async () => {
  const out = parseQuoteWorkbook(await readXlsx(await readFile(TEMPLATE)));
  expect(out.errors).toEqual([
    "Bia: chưa điền tên công trình.",
    "Bia: chưa điền địa chỉ công trình.",
    "Bia: chưa điền tên Bên A.",
    "Bảng báo giá: chưa có dòng nào điền cả khối lượng và đơn giá.",
  ]);
  // Bên B — the company's own block — never leaks into the client.
  expect(out.client.tax_code).toBeUndefined();
  expect(out.contact).toBeNull();
});

test("a filled quote → header, client, contact, sections and money", async () => {
  const out = await filled({ sheet1: COVER, sheet2: PRICED });
  expect(out.errors).toEqual([]);
  expect(out.warnings).toEqual([]);
  expect(out.project).toEqual({
    name: "Bread Talk",
    code_ref: "2026/07/15-BreadTalk",
    type_names: ["Tháo dỡ", "Vệ sinh"],
    date: "15/07/2026",
    site_address: "B3-15A, TTTM Vincom Center, 72 Lê Thánh Tôn",
  });
  expect(out.client).toEqual({
    name: "CÔNG TY CỔ PHẦN BÌNH MINH TOÀN CẦU",
    type: ClientType.COMPANY,
    tax_code: "0309554620",
    address: "121 đường 10 Tây, Phường Tân Hưng",
  });
  expect(out.contact).toEqual({
    name: "Trần Khánh Vân",
    title: "Phó Tổng Giám Đốc",
    phone: "0912345678",
  });
  expect(out.quote).toEqual({
    items: [
      {
        category: "I. CÔNG TÁC CHUẨN BỊ",
        description: "Bảo hiểm công trình",
        unit: "gói",
        quantity: 1,
        unit_price: 2_000_000,
      },
      {
        category: "II. HẠNG MỤC TRẦN",
        description: "Tháo trần thạch cao",
        unit: "m2",
        quantity: 120,
        unit_price: 85_000,
      },
    ],
    vat_rate: 0.08,
    discount_amount: 200_000,
  });
  expect(out.settlement).toBeNull();
  expect(out.stage).toBe(ProjectStage.QUOTE);
});

test("nghiệm thu quantities → acceptance; quyết toán thực tế → settlement", async () => {
  const accepted = await filled({
    sheet1: COVER,
    sheet2: PRICED,
    sheet3: { E25: 1 }, // Khối lượng nghiệm thu, row 1.1
  });
  expect(accepted.stage).toBe(ProjectStage.ACCEPTANCE);
  expect(accepted.settlement).toBeNull();

  const settled = await filled({
    sheet1: COVER,
    sheet2: PRICED,
    sheet3: { E25: 1 },
    // quyết toán: Đơn giá D, Khối lượng thực tế G; 1.2 Đóng hoarding row 27.
    sheet4: { D27: 150_000, G27: 40, H27: 6_000_000, H46: 6_000_000 },
  });
  expect(settled.errors).toEqual([]);
  expect(settled.stage).toBe(ProjectStage.SETTLEMENT);
  expect(settled.settlement).toEqual({
    items: [
      {
        category: "I. CÔNG TÁC CHUẨN BỊ",
        description: "Đóng hoarding",
        unit: "m2",
        quantity: 40,
        unit_price: 150_000,
      },
    ],
    vat_rate: 0.08,
    discount_amount: 0,
  });
});

test("half-filled lines and a stale file total are reported", async () => {
  const out = await filled({
    sheet1: COVER,
    // 2.1 has a khối lượng but no đơn giá; the file's total is a formula that
    // missed a line (the template sums a fixed range).
    sheet2: { ...PRICED, E25: "", F42: 1_000_000 },
  });
  expect(out.errors).toEqual([
    'Bảng báo giá dòng 25: "Tháo trần thạch cao" thiếu đơn giá.',
  ]);
  expect(out.warnings[0]).toMatch(/tổng trước thuế trong file .* khác/);
});

test("the value may sit in the next column, never further right", async () => {
  const out = await filled({
    sheet1: { ...COVER, B4: "Công trình:", C4: "Minigood L3-14C" },
    sheet2: PRICED,
  });
  expect(out.project.name).toBe("Minigood L3-14C");
});

test("an individual Bên A, a landline kept as typed", async () => {
  const out = await filled({
    sheet1: {
      ...COVER,
      C18: "Nguyễn Văn An",
      B22: "Mã số thuế: .",
      B23: "Điện thoại: 028 37751727",
    },
    sheet2: PRICED,
  });
  expect(out.client.type).toBe(ClientType.INDIVIDUAL);
  expect(out.contact?.phone).toBe("028 37751727");
});

test("normalizePhone mirrors the Nest helper", () => {
  expect(normalizePhone("+84 912-345-678")).toBe("0912345678");
  expect(normalizePhone("0912 345 678")).toBe("0912345678");
  expect(normalizePhone("028 37751727")).toBeNull();
});

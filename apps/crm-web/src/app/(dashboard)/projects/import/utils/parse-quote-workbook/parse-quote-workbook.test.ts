import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";
import { readXlsx } from "@/utils/read-xlsx/read-xlsx";

import { ProjectStage } from "../../../enums";
import { normalizePhone, parseQuoteWorkbook } from "./parse-quote-workbook";
import {
  COVER,
  PRICED,
  SETTLED,
  type Sheets,
  TEMPLATE,
  fillTemplate,
} from "./test-fixtures";

const filled = async (sheets: Sheets) =>
  parseQuoteWorkbook(await readXlsx(await fillTemplate(sheets)));

test("the unfilled template reads back blank, and only money blocks it", async () => {
  const out = parseQuoteWorkbook(await readXlsx(await readFile(TEMPLATE)));
  // The header placeholders come back empty — the card asks for them
  // (missing-fields.ts); only what Excel must fix is an error.
  expect(out.project.name).toBe("");
  expect(out.project.site_address).toBe("");
  expect(out.client.name).toBe("");
  expect(out.errors).toEqual([
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
    sheet4: SETTLED,
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

test("a surname that starts like an honorific is kept whole", async () => {
  const out = await filled({
    sheet1: { ...COVER, B19: "Đại diện bởi Bạch Văn Long" },
    sheet2: PRICED,
  });
  expect(out.contact?.name).toBe("Bạch Văn Long");
});

test("a price typed as text with comma grouping is thousands, not decimals", async () => {
  const out = await filled({
    sheet1: COVER,
    sheet2: { ...PRICED, E25: "85,000" },
  });
  expect(out.quote.items[1]?.unit_price).toBe(85_000);
  expect(out.warnings).toEqual([]);
});

test("terms text below the totals never overrides giảm giá or VAT", async () => {
  const out = await filled({
    sheet1: COVER,
    sheet2: {
      ...PRICED,
      B49: "Giảm giá thêm 5% nếu thanh toán sớm",
      B50: "Thuế VAT 10% áp dụng cho hạng mục phát sinh",
    },
  });
  expect(out.quote.discount_amount).toBe(200_000);
  expect(out.quote.vat_rate).toBe(0.08);
});

test("an MST or phone typed as a number gets its leading zero back", async () => {
  const out = await filled({
    sheet1: {
      ...COVER,
      B22: "Mã số thuế:",
      C22: 309554620,
      B23: "Điện thoại:",
      C23: 912345678,
    },
    sheet2: PRICED,
  });
  expect(out.client.tax_code).toBe("0309554620");
  expect(out.contact?.phone).toBe("0912345678");
});

// A real job's workbook (ACE/EMART, 08-2026) words the same table its own
// way. Every heading here was copied from that file.
test("the headings a real workbook uses are read the same", async () => {
  const out = await filled({
    sheet1: COVER,
    sheet2: {
      ...PRICED,
      B20: "Tên hàng hóa, dịch vụ",
      C20: "Đơn vị tính",
      D20: "Số lượng",
      A42: "TỔNG CỘNG CHƯA BAO GỒM THUẾ",
      A45: "THUẾ GIÁ TRỊ GIA TĂNG 8%",
      A46: "TỔNG CỘNG BAO GỒM THUẾ GTGT",
    },
  });
  expect(out.errors).toEqual([]);
  expect(out.warnings).toEqual([]);
  expect(out.quote.vat_rate).toBe(0.08);
  expect(out.quote.items.map((i) => i.unit_price)).toEqual([2_000_000, 85_000]);
  expect(out.quote.items[1]?.unit).toBe("m2");
});

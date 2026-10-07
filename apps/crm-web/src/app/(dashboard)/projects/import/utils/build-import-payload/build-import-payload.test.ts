import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";

import { ProjectStage } from "../../../enums";
import { importProjectSchema } from "../../schema";
import type { ParsedWorkbook, WorkbookMatch } from "../../types";
import { buildImportPayload } from "./build-import-payload";

const MONEY = {
  items: [
    { description: "Tháo trần", unit: "m2", quantity: 120, unit_price: 85_000 },
  ],
  vat_rate: 0.08,
  discount_amount: 0,
};

const WORKBOOK: ParsedWorkbook = {
  project: {
    name: "Bread Talk",
    code_ref: "2026/07/15-BreadTalk",
    type_names: ["Tháo dỡ"],
    date: "15/07/2026",
    site_address: "72 Lê Thánh Tôn",
  },
  client: {
    name: "CÔNG TY BÌNH MINH",
    type: ClientType.COMPANY,
    tax_code: "0309554620",
  },
  contact: { name: "Trần Khánh Vân", phone: "0912345678" },
  quote: MONEY,
  settlement: { ...MONEY, items: [{ ...MONEY.items[0]!, quantity: 110 }] },
  stage: ProjectStage.SETTLEMENT,
  errors: [],
  warnings: [],
};

const NOTHING_MATCHED: WorkbookMatch = {
  client: null,
  location: null,
  contact: null,
  type_ids: [1],
  unmatched_types: [],
  duplicates: [],
};

test("nothing matched → everything created from the workbook", () => {
  const body = buildImportPayload({
    fileName: "BG Bread Talk.xlsx",
    workbook: WORKBOOK,
    match: NOTHING_MATCHED,
    stage: ProjectStage.SETTLEMENT,
    typeIds: [1],
  });
  expect(body).toEqual({
    client: {
      name: "CÔNG TY BÌNH MINH",
      type: ClientType.COMPANY,
      tax_code: "0309554620",
      address: undefined,
    },
    contact: { name: "Trần Khánh Vân", title: undefined, phone: "0912345678" },
    location: { name: "Bread Talk", address: "72 Lê Thánh Tôn" },
    name: "Bread Talk",
    type_ids: [1],
    stage: ProjectStage.SETTLEMENT,
    request_note:
      "Nhập từ báo giá: BG Bread Talk.xlsx · Mã số CT: 2026/07/15-BreadTalk · Ngày báo giá: 15/07/2026",
    quote: MONEY,
    settlement: WORKBOOK.settlement,
  });
  // The server action forwards only what passes this.
  expect(importProjectSchema.safeParse(body).success).toBe(true);
});

test("matched rows go by id; a settlement never travels below its stage", () => {
  const body = buildImportPayload({
    fileName: "x.xlsx",
    workbook: WORKBOOK,
    match: {
      ...NOTHING_MATCHED,
      client: { id: 7, name: "Bình Minh" },
      location: { id: 9, name: "Bread Talk" },
      contact: { id: 3, name: "Chị Vân" },
    },
    stage: ProjectStage.ACCEPTANCE,
    typeIds: [1, 2],
  });
  expect(body.client).toEqual({ id: 7 });
  expect(body.location).toEqual({ id: 9 });
  expect(body.contact).toEqual({ id: 3 });
  expect(body.settlement).toBeUndefined();
  expect(importProjectSchema.safeParse(body).success).toBe(true);
});

test("no types picked is refused at the boundary", () => {
  const body = buildImportPayload({
    fileName: "x.xlsx",
    workbook: WORKBOOK,
    match: NOTHING_MATCHED,
    stage: ProjectStage.QUOTE,
    typeIds: [],
  });
  expect(importProjectSchema.safeParse(body).success).toBe(false);
});

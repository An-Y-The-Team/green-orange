import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";

import { ProjectStage } from "../../../enums";
import type { ParsedWorkbook, WorkbookMatch } from "../../types";
import { createdRefs, reuseCreated } from "./reuse-created";

const workbook = (overrides: Partial<ParsedWorkbook> = {}): ParsedWorkbook => ({
  project: {
    name: "Bread Talk",
    type_names: [],
    site_address: "72 Lê Thánh Tôn",
  },
  client: {
    name: "CÔNG TY MỚI",
    type: ClientType.COMPANY,
    tax_code: "0309554620",
  },
  contact: { name: "Chị Vân", phone: "0912345678" },
  quote: { items: [], vat_rate: 0.08, discount_amount: 0 },
  settlement: null,
  stage: ProjectStage.QUOTE,
  errors: [],
  warnings: [],
  ...overrides,
});

const NEW: WorkbookMatch = {
  client: null,
  location: null,
  contact: null,
  type_ids: [1],
  unmatched_types: [],
  duplicates: [],
};

const FIRST = createdRefs({
  match: NEW,
  workbook: workbook(),
  project: {
    id: 50,
    code: "CT-2026-050",
    name: "Bread Talk",
    client_id: 7,
    location_id: 9,
    working_contact_id: 3,
  },
});

test("a second file for the same new client and site reuses all three", () => {
  expect(
    reuseCreated({ match: NEW, workbook: workbook(), created: [FIRST] })
  ).toEqual({
    ...NEW,
    client: { id: 7, name: "CÔNG TY MỚI" },
    location: { id: 9, name: "Bread Talk" },
    contact: { id: 3, name: "Chị Vân" },
  });
});

test("same client, another site and person → only the client is reused", () => {
  const out = reuseCreated({
    match: NEW,
    workbook: workbook({
      project: { name: "Kho 2", type_names: [], site_address: "1 Lê Lợi" },
      contact: { name: "Anh Tùng" },
    }),
    created: [FIRST],
  });
  expect(out.client).toEqual({ id: 7, name: "CÔNG TY MỚI" });
  expect(out.location).toBeNull();
  expect(out.contact).toBeNull();
});

test("another client is untouched; an existing match always wins", () => {
  const other = workbook({
    client: { name: "KHÁC", type: ClientType.COMPANY, tax_code: "0100000000" },
  });
  expect(reuseCreated({ match: NEW, workbook: other, created: [FIRST] })).toBe(
    NEW
  );

  const matched = { ...NEW, client: { id: 1, name: "An Phát" } };
  expect(
    reuseCreated({ match: matched, workbook: workbook(), created: [FIRST] })
      .client
  ).toEqual({ id: 1, name: "An Phát" });
});

import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";

import { ProjectStage } from "../../../enums";
import { ImportField } from "../../enums";
import type { ParsedWorkbook, WorkbookMatch } from "../../types";
import { fieldsToAsk, missingFields, withField } from "./missing-fields";

const workbook = (overrides: Partial<ParsedWorkbook> = {}): ParsedWorkbook => ({
  project: {
    name: "Bread Talk",
    type_names: [],
    site_address: "72 Lê Thánh Tôn",
  },
  client: { name: "CÔNG TY E2E", type: ClientType.COMPANY },
  contact: null,
  quote: { items: [], vat_rate: 0.08, discount_amount: 0 },
  settlement: null,
  stage: ProjectStage.QUOTE,
  errors: [],
  warnings: [],
  ...overrides,
});

const NOTHING_MATCHED: WorkbookMatch = {
  client: null,
  location: null,
  contact: null,
  type_ids: [],
  unmatched_types: [],
  duplicates: [],
};

test("a filled cover needs nothing typed", () => {
  expect(
    missingFields({ workbook: workbook(), match: NOTHING_MATCHED })
  ).toEqual([]);
});

test("every blank the template leaves behind is asked for", () => {
  const blank = workbook({
    project: { name: "", type_names: [], site_address: "" },
    client: { name: "", type: ClientType.INDIVIDUAL },
  });
  expect(missingFields({ workbook: blank, match: NOTHING_MATCHED })).toEqual([
    ImportField.PROJECT_NAME,
    ImportField.SITE_ADDRESS,
    ImportField.CLIENT_NAME,
  ]);
  // Whitespace is blank; an unreadable file is the UNREADABLE state's problem.
  expect(
    missingFields({
      workbook: workbook({ client: { name: "  ", type: ClientType.COMPANY } }),
      match: NOTHING_MATCHED,
    })
  ).toEqual([ImportField.CLIENT_NAME]);
  expect(missingFields({ workbook: null })).toEqual([]);
});

test("a matched client or site is used as it stands, blank name or not", () => {
  const blank = workbook({
    project: { name: "Bread Talk", type_names: [], site_address: "" },
    client: { name: "", type: ClientType.COMPANY },
  });
  expect(
    missingFields({
      workbook: blank,
      match: {
        ...NOTHING_MATCHED,
        client: { id: 7, name: "An Phát" },
        location: { id: 9, name: "Toà nhà A" },
      },
    })
  ).toEqual([]);
  // Not looked up yet → still asked for, so nothing silently imports blank.
  expect(missingFields({ workbook: blank })).toEqual([
    ImportField.SITE_ADDRESS,
    ImportField.CLIENT_NAME,
  ]);
});

test("the card keeps asking once typing starts, and drops what a match covers", () => {
  const blankFields = [ImportField.PROJECT_NAME, ImportField.CLIENT_NAME];
  // Still asked after the first keystroke — the box must not vanish.
  expect(fieldsToAsk({ blankFields, match: NOTHING_MATCHED })).toEqual([
    ImportField.PROJECT_NAME,
    ImportField.CLIENT_NAME,
  ]);
  // Picking an existing client answers that one for good.
  expect(
    fieldsToAsk({
      blankFields,
      match: { ...NOTHING_MATCHED, client: { id: 7, name: "An Phát" } },
    })
  ).toEqual([ImportField.PROJECT_NAME]);
  expect(fieldsToAsk({ blankFields: [], match: NOTHING_MATCHED })).toEqual([]);
});

test("withField writes the one field the operator typed", () => {
  const before = workbook();
  const after = withField({
    workbook: before,
    field: ImportField.SITE_ADDRESS,
    value: "1 Lê Lợi",
  });
  expect(after.project.site_address).toBe("1 Lê Lợi");
  expect(after.project.name).toBe("Bread Talk");
  expect(before.project.site_address).toBe("72 Lê Thánh Tôn");
  expect(
    withField({ workbook: before, field: ImportField.CLIENT_NAME, value: "X" })
      .client
  ).toEqual({ name: "X", type: ClientType.COMPANY });
});

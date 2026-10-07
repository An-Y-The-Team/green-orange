import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";

import { ProjectStage } from "../../../../../enums";
import { ImportRowState } from "../../../../enums";
import type { ParsedWorkbook } from "../../../../types";
import type { ImportRow } from "../../types";
import { isImportable, rowState } from "./row-state";

const WORKBOOK: ParsedWorkbook = {
  project: { name: "x", type_names: [], site_address: "y" },
  client: { name: "z", type: ClientType.INDIVIDUAL },
  contact: null,
  quote: { items: [], vat_rate: 0.08, discount_amount: 0 },
  settlement: null,
  stage: ProjectStage.QUOTE,
  errors: [],
  warnings: [],
};

const ROW: ImportRow = {
  key: "k",
  file: new File([], "x.xlsx"),
  workbook: WORKBOOK,
  matching: false,
  match: {
    client: null,
    location: null,
    contact: null,
    type_ids: [1],
    unmatched_types: [],
    duplicates: [],
  },
  stage: ProjectStage.QUOTE,
  typeIds: [1],
};

test("each state, in the order a file moves through them", () => {
  expect(rowState({ ...ROW, workbook: null })).toBe(ImportRowState.UNREADABLE);
  expect(rowState({ ...ROW, matching: true })).toBe(ImportRowState.CHECKING);
  expect(
    rowState({ ...ROW, workbook: { ...WORKBOOK, errors: ["Bia: …"] } })
  ).toBe(ImportRowState.BLOCKED);
  // A failed lookup never falls back to "new client".
  expect(rowState({ ...ROW, matchError: "down" })).toBe(ImportRowState.BLOCKED);
  expect(rowState({ ...ROW, typeIds: [] })).toBe(ImportRowState.NEEDS_PICK);
  expect(rowState(ROW)).toBe(ImportRowState.READY);
  expect(
    rowState({ ...ROW, result: { key: "k", ok: false, message: "400" } })
  ).toBe(ImportRowState.FAILED);
  expect(
    rowState({
      ...ROW,
      result: { key: "k", ok: true, project: { id: 1, code: "CT", name: "x" } },
    })
  ).toBe(ImportRowState.IMPORTED);
});

test("only ready or refused files import; never one already created", () => {
  expect(isImportable(ROW)).toBe(true);
  expect(
    isImportable({ ...ROW, result: { key: "k", ok: false, message: "x" } })
  ).toBe(true);
  expect(
    isImportable({
      ...ROW,
      result: { key: "k", ok: true, project: { id: 1, code: "CT", name: "x" } },
    })
  ).toBe(false);
  expect(isImportable({ ...ROW, typeIds: [] })).toBe(false);
});

import { expect, test } from "vitest";

import {
  TimekeepingSource,
  TimekeepingStatus,
} from "@/app/(dashboard)/crew/enums";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

import { cellFor } from "./cell-for";

// What must not regress: a manual and a zalo_app row legitimately coexist for
// one member+day (the composite key includes `source`), and the cell must keep
// them apart — manual is what the grid shows and totals count, never a sum.
// Picking the wrong bucket here silently mixes an operator's correction with a
// worker's claim.
const row = (over: Partial<TimekeepingRecord>): TimekeepingRecord =>
  ({
    id: 1,
    crew_member_id: 1,
    project_id: 2,
    work_date: "2026-08-05",
    hours: 8,
    source: TimekeepingSource.ZALO_APP,
    status: TimekeepingStatus.APPROVED,
    created_at: "2026-08-05T00:00:00.000Z",
    ...over,
  }) as TimekeepingRecord;

const cell = (records: TimekeepingRecord[]) =>
  cellFor({ records, memberId: 1, date: "2026-08-05" });

test("an empty list yields neither row", () => {
  expect(cell([])).toEqual({ manual: undefined, zalo: undefined });
});

test("a manual-only cell", () => {
  const manual = row({ id: 1, source: TimekeepingSource.MANUAL });
  expect(cell([manual])).toEqual({ manual, zalo: undefined });
});

test("a zalo-only cell", () => {
  const zalo = row({ id: 2 });
  expect(cell([zalo])).toEqual({ manual: undefined, zalo });
});

// The collision the composite key allows, and the reason this util exists.
test("both sources are returned separately, never merged", () => {
  const manual = row({ id: 1, source: TimekeepingSource.MANUAL, hours: 8 });
  const zalo = row({ id: 2, hours: 6 });
  expect(cell([manual, zalo])).toEqual({ manual, zalo });
});

test("order in the record list does not decide which bucket wins", () => {
  const manual = row({ id: 1, source: TimekeepingSource.MANUAL, hours: 8 });
  const zalo = row({ id: 2, hours: 6 });
  expect(cell([zalo, manual])).toEqual({ manual, zalo });
});

test("another member's row on the same date is excluded", () => {
  expect(cell([row({ crew_member_id: 99 })])).toEqual({
    manual: undefined,
    zalo: undefined,
  });
});

test("the same member on another date is excluded", () => {
  expect(cell([row({ work_date: "2026-08-06" })])).toEqual({
    manual: undefined,
    zalo: undefined,
  });
});

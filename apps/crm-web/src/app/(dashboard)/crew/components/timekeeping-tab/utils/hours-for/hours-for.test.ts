import { expect, test } from "vitest";

import { TimekeepingSource, TimekeepingStatus } from "../../../../enums";
import type { TimekeepingRecord } from "../../../../types";
import { hoursFor } from "./hours-for";

// What must not regress: only APPROVED hours reach a total. Every other status
// is a claim the operator has not accepted — an open shift most of all, since it
// carries hours 0 and no end time, and counting it would bank a day that has
// not finished. Manual wins over zalo for the same member+day, never sums.
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

const hours = (records: TimekeepingRecord[]) =>
  hoursFor({ records, memberId: 1, date: "2026-08-05" });

test("an empty cell is zero", () => {
  expect(hours([])).toBe(0);
});

test("an approved zalo row counts in full", () => {
  expect(hours([row({})])).toBe(8);
});

test("a shift still open counts nothing — it has not finished", () => {
  expect(
    hours([row({ status: TimekeepingStatus.OPEN, hours: 0, end_time: null })])
  ).toBe(0);
});

test("a pending submission counts nothing until duyệt", () => {
  expect(hours([row({ status: TimekeepingStatus.PENDING })])).toBe(0);
});

test("a rejected submission counts nothing", () => {
  expect(hours([row({ status: TimekeepingStatus.REJECTED })])).toBe(0);
});

test("manual wins over zalo for the same day, and does not sum", () => {
  expect(
    hours([
      row({ id: 1, source: TimekeepingSource.MANUAL, hours: 8 }),
      row({ id: 2, source: TimekeepingSource.ZALO_APP, hours: 6 }),
    ])
  ).toBe(8);
});

// A manual row is born approved, so the operator's correction stands even while
// the worker's own submission for that day is still pending or open.
test("manual wins even when the zalo row is still open", () => {
  expect(
    hours([
      row({ id: 1, source: TimekeepingSource.MANUAL, hours: 7 }),
      row({ id: 2, status: TimekeepingStatus.OPEN, hours: 0 }),
    ])
  ).toBe(7);
});

test("another member's row on the same day is not counted", () => {
  expect(hours([row({ crew_member_id: 99, hours: 8 })])).toBe(0);
});

test("the same member on another day is not counted", () => {
  expect(hours([row({ work_date: "2026-08-06", hours: 8 })])).toBe(0);
});

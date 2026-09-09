import { expect, test } from "vitest";

import {
  TimekeepingSource,
  TimekeepingStatus,
} from "@/app/(dashboard)/crew/enums";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

import { baselineHours } from "./baseline-hours";

// What must not regress: a blur that changed nothing must never write. The old
// guard only knew about the manual row, so tabbing through a Zalo-only cell
// silently created an approved manual row — bypassing duyệt, and (for an open
// shift) banking a 0 that outlived the operator approving the real hours.
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

test("an empty cell has no baseline, so a first entry always writes", () => {
  expect(baselineHours({})).toBeUndefined();
});

test("the manual row wins when both exist", () => {
  expect(
    baselineHours({
      manual: row({ source: TimekeepingSource.MANUAL, hours: 8 }),
      zalo: row({ hours: 6 }),
    })
  ).toBe(8);
});

// The four cases the old guard missed — one per status, because the baseline
// must not care which one it is.
test("a zalo row is the baseline whatever its status", () => {
  for (const status of [
    TimekeepingStatus.APPROVED,
    TimekeepingStatus.PENDING,
    TimekeepingStatus.REJECTED,
  ]) {
    expect(baselineHours({ zalo: row({ status, hours: 9 }) })).toBe(9);
  }
});

// The worst case: an open shift carries hours 0, so without a baseline the blur
// wrote an approved manual 0 that then beat the real shift in every total.
test("an open shift's baseline is 0, not undefined", () => {
  expect(
    baselineHours({
      zalo: row({ status: TimekeepingStatus.OPEN, hours: 0, end_time: null }),
    })
  ).toBe(0);
});

// Zero is a recorded value, not an absent one — the commit path treats "" and
// "0" as different facts, and so must this.
test("a manual zero is a baseline, distinct from an empty cell", () => {
  expect(
    baselineHours({
      manual: row({ source: TimekeepingSource.MANUAL, hours: 0 }),
    })
  ).toBe(0);
});

test("fractional hours survive", () => {
  expect(baselineHours({ zalo: row({ hours: 6.5 }) })).toBe(6.5);
});

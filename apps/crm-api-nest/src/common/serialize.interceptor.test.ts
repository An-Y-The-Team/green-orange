// Isolated tests for the serialization choke point. The six headline
// round-trips (BigInt, Decimal, *_date, *_at, nesting, null/undefined) are
// already asserted in ../contract.test.ts — these cover what that file does not:
// how `columnName` reaches a value, which is the only thing deciding date-only
// vs full ISO.
import { Prisma } from "@prisma/client";
import { describe, expect, test } from "bun:test";

import { DATE_ONLY_SUFFIX, normalize } from "./serialize.interceptor";

describe("normalize — column-name plumbing", () => {
  test("the date-only rule is the *_date suffix", () => {
    expect(DATE_ONLY_SUFFIX).toBe("_date");
  });

  test("keeps the key while walking arrays of rows (list endpoints)", () => {
    // The real shape: GET /settlements/:id → { milestones: [ { due_date } ] }.
    expect(
      normalize({
        milestones: [
          { due_date: new Date("2026-06-01T00:00:00Z"), amount: 5_000_000n },
          { due_date: new Date("2026-07-15T00:00:00Z"), amount: 7_500_000n },
        ],
      })
    ).toEqual({
      milestones: [
        { due_date: "2026-06-01", amount: 5_000_000 },
        { due_date: "2026-07-15", amount: 7_500_000 },
      ],
    });
  });

  test("an array of dates under a *_date key stays date-only", () => {
    expect(
      normalize({ visit_date: [new Date("2026-03-02T00:00:00Z")] })
    ).toEqual({ visit_date: ["2026-03-02"] });
  });

  test("a key that merely contains '_date' mid-string is a timestamp", () => {
    // endsWith, not includes — `_date_confirmed_at` must keep its time.
    expect(
      normalize({ _date_confirmed_at: new Date("2026-07-20T02:00:00.000Z") })
    ).toEqual({ _date_confirmed_at: "2026-07-20T02:00:00.000Z" });
  });

  test("a keyless Date (top-level return) serializes as full ISO", () => {
    expect(normalize(new Date("2026-07-20T02:00:00.000Z"))).toBe(
      "2026-07-20T02:00:00.000Z"
    );
  });

  test("top-level scalars pass through unwrapped", () => {
    expect(normalize(120_000_000n)).toBe(120_000_000);
    expect(normalize(new Prisma.Decimal("7.5"))).toBe(7.5);
    expect(normalize("HD-2026-001")).toBe("HD-2026-001");
    expect(normalize(true)).toBe(true);
    expect(normalize(null)).toBeNull();
    expect(normalize(undefined)).toBeUndefined();
  });
});

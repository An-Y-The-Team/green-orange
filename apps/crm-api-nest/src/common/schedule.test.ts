// Double-booking: whose phân công windows share a day.
//
// Twin of crm-api's `tests/test_schedule.py` (the pure half). If one of these
// changes, the Python one changes with it — the roster must warn about the same
// pairs whichever backend CRM_API_URL points at.
import { describe, expect, test } from "bun:test";

import { overlappingIds, rangesOverlap } from "./schedule";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("rangesOverlap", () => {
  test("windows that plainly share days clash", () => {
    // Aug 10-20 and Aug 15-25 share Aug 15-20.
    expect(
      rangesOverlap(
        d("2026-08-10"),
        d("2026-08-20"),
        d("2026-08-15"),
        d("2026-08-25")
      )
    ).toBe(true);
    // Fully contained counts too — Aug 12-14 is inside Aug 10-20.
    expect(
      rangesOverlap(
        d("2026-08-10"),
        d("2026-08-20"),
        d("2026-08-12"),
        d("2026-08-14")
      )
    ).toBe(true);
  });

  test("windows in different months do not clash", () => {
    expect(
      rangesOverlap(
        d("2026-07-01"),
        d("2026-07-05"),
        d("2026-08-10"),
        d("2026-08-20")
      )
    ).toBe(false);
  });

  test("windows that touch on one day clash", () => {
    // A finishes the same day B starts. Nobody is on two sites in one day, and
    // the write path already answers "clash" — GET must not disagree with POST.
    expect(
      rangesOverlap(
        d("2026-03-01"),
        d("2026-03-10"),
        d("2026-03-10"),
        d("2026-03-20")
      )
    ).toBe(true);
  });

  test("windows that merely abut do not clash", () => {
    // A ends the day BEFORE B starts: no shared day, no warning.
    expect(
      rangesOverlap(
        d("2026-03-01"),
        d("2026-03-09"),
        d("2026-03-10"),
        d("2026-03-20")
      )
    ).toBe(false);
  });

  test("a single-day window clashes with itself", () => {
    expect(
      rangesOverlap(
        d("2026-05-05"),
        d("2026-05-05"),
        d("2026-05-05"),
        d("2026-05-05")
      )
    ).toBe(true);
  });

  test("an open-ended window runs forever forward", () => {
    // No to_date = still on the job. It swallows everything that starts after.
    expect(
      rangesOverlap(d("2026-01-01"), null, d("2030-06-01"), d("2030-06-30"))
    ).toBe(true);
    // …but not something that finished before it began.
    expect(
      rangesOverlap(d("2026-01-01"), null, d("2025-01-01"), d("2025-12-31"))
    ).toBe(false);
  });

  test("two open-ended windows always clash", () => {
    expect(rangesOverlap(d("2026-01-01"), null, d("2030-01-01"), null)).toBe(
      true
    );
  });

  test("the answer does not depend on argument order", () => {
    // Overlap is symmetric. If this fails, one of the null branches is lopsided.
    const pairs: [[Date, Date | null], [Date, Date | null]][] = [
      [
        [d("2026-08-10"), d("2026-08-20")],
        [d("2026-08-15"), null],
      ],
      [
        [d("2026-01-01"), null],
        [d("2025-01-01"), d("2025-12-31")],
      ],
      [
        [d("2026-03-01"), d("2026-03-09")],
        [d("2026-03-10"), d("2026-03-20")],
      ],
    ];
    for (const [[aFrom, aTo], [bFrom, bTo]] of pairs) {
      expect(rangesOverlap(aFrom, aTo, bFrom, bTo)).toBe(
        rangesOverlap(bFrom, bTo, aFrom, aTo)
      );
    }
  });
});

describe("overlappingIds", () => {
  test("nothing in, nothing out", () => {
    expect([...overlappingIds([])]).toEqual([]);
  });

  test("a lone assignment clashes with nobody", () => {
    // Present as a key with an empty array — never a missing key.
    const result = overlappingIds([[7, d("2026-08-10"), d("2026-08-20")]]);
    expect(result.get(7)).toEqual([]);
    expect(result.has(7)).toBe(true);
  });

  test("every pair is reported from both sides", () => {
    const result = overlappingIds([
      [1, d("2026-08-10"), d("2026-08-20")],
      [2, d("2026-08-15"), null],
    ]);
    expect(result.get(1)).toEqual([2]);
    expect(result.get(2)).toEqual([1]);
  });

  test("a chain does not make the ends clash", () => {
    // A-B overlap and B-C overlap, but A and C never share a day. Reporting
    // A against C would be a transitive-closure bug.
    const result = overlappingIds([
      [1, d("2026-08-01"), d("2026-08-10")],
      [2, d("2026-08-08"), d("2026-08-18")],
      [3, d("2026-08-15"), d("2026-08-25")],
    ]);
    expect(result.get(1)).toEqual([2]);
    expect(result.get(2)).toEqual([1, 3]);
    expect(result.get(3)).toEqual([2]);
  });

  test("an assignment never clashes with itself", () => {
    const result = overlappingIds([
      [1, d("2026-08-01"), d("2026-08-10")],
      [2, d("2026-08-05"), d("2026-08-15")],
    ]);
    for (const [ownId, clashes] of result) {
      expect(clashes).not.toContain(ownId);
    }
  });
});

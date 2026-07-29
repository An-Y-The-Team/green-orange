// The seed is the only dataset local dev has (it replaced crm-web's mock
// fixtures), so its invariants are worth failing on: the money must add up the
// way receivables.module.ts keeps it, the "today" fixture must be genuinely
// today, and every stage must still have a project to render. No DB — the seed
// guards its main() behind `import.meta.main`, so importing it is free.
import { describe, expect, test } from "bun:test";

import { businessDateString } from "./common/business-date";
import { STAGE_ORDER } from "./common/stage";
import {
  ASSIGNMENTS,
  BILLS,
  MILESTONES,
  PAPERWORK,
  PROJECTS,
  PROJECT_TYPES,
  QUOTES,
  QUOTE_ITEMS,
  SETTLEMENTS,
  SETTLEMENT_ITEMS,
  TIMEKEEPING,
  day,
} from "./seed";

const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);

describe("business dates", () => {
  test("day(0) is today in the business timezone, at UTC midnight", () => {
    expect(businessDateString(day(0))).toBe(businessDateString());
    expect(day(0).toISOString()).toEndWith("T00:00:00.000Z");
  });
  test("day(n) shifts by whole days without drifting", () => {
    expect(day(-5).getTime()).toBe(day(0).getTime() - 5 * 86_400_000);
    expect(day(0).toISOString().slice(11)).toBe(
      day(-400).toISOString().slice(11)
    );
  });
  test("the stage-1 appointment is genuinely today, 09:00 Vietnam time", () => {
    const appointment = PROJECTS.find((p) => p.stage === "request")
      ?.appointment_at as Date;
    expect(businessDateString(appointment)).toBe(businessDateString());
    expect(appointment.toISOString()).toEndWith("T02:00:00.000Z");
  });
});

describe("coverage the UI depends on", () => {
  test("one project per lifecycle stage", () => {
    expect([...new Set(PROJECTS.map((p) => p.stage))].sort()).toEqual(
      [...STAGE_ORDER].sort()
    );
  });
  test("every project tags a type from the seeded catalog", () => {
    for (const p of PROJECTS) {
      expect(p.type_names.length).toBeGreaterThan(0);
      for (const name of p.type_names) expect(PROJECT_TYPES).toContain(name);
    }
  });
  test("a quote pair on one project supersedes v1", () => {
    const pair = QUOTES.filter((q) => q.project_id === 1);
    expect(pair.map((q) => q.version)).toEqual([1, 2]);
    expect(pair.map((q) => q.status)).toEqual(["rejected", "waiting"]);
  });
  test("a crew member is double-booked over overlapping dates", () => {
    // Same predicate the API's overlap warning uses (crew.module.ts).
    type A = (typeof ASSIGNMENTS)[number];
    const range = (x: A) =>
      [x.from_date as Date, (x.to_date as Date | undefined) ?? null] as const;
    const overlaps = (x: A, y: A) => {
      const [xa, xb] = range(x);
      const [ya, yb] = range(y);
      return (xb === null || xb >= ya) && (yb === null || yb >= xa);
    };
    const pairs = ASSIGNMENTS.flatMap((x, i) =>
      ASSIGNMENTS.slice(i + 1)
        .filter((y) => y.crew_member_id === x.crew_member_id && overlaps(x, y))
        .map((y) => [x, y] as const)
    );
    // Both flavours: two projects at once, and twice on one project.
    expect(pairs.some(([x, y]) => x.project_id !== y.project_id)).toBe(true);
    expect(pairs.some(([x, y]) => x.project_id === y.project_id)).toBe(true);
  });
  test("one paperwork item is overdue and not approved", () => {
    const overdue = PAPERWORK.filter(
      (i) =>
        i.status !== "approved" &&
        i.due_date instanceof Date &&
        i.due_date < day(0)
    );
    expect(overdue.length).toBeGreaterThan(0);
  });
  test("one payment milestone is overdue and unpaid", () => {
    const overdue = MILESTONES.filter(
      (m) =>
        m.status !== "paid" && m.due_date instanceof Date && m.due_date < day(0)
    );
    expect(overdue.length).toBeGreaterThan(0);
  });
  test("a manual and a zalo_app row share one member+project+day", () => {
    const key = (r: (typeof TIMEKEEPING)[number]) =>
      `${r.crew_member_id}/${r.project_id}/${(r.work_date as Date).toISOString()}`;
    const manual = TIMEKEEPING.filter((r) => r.source === "manual").map(key);
    const zalo = TIMEKEEPING.filter((r) => r.source === "zalo_app").map(key);
    expect(zalo.filter((k) => manual.includes(k)).length).toBeGreaterThan(0);
  });
});

describe("money invariants (receivables.module.ts keeps these on sign)", () => {
  test("quote items sum to the quote total", () => {
    for (const q of QUOTES)
      expect(
        sum(
          QUOTE_ITEMS.filter((i) => i.quote_id === q.id).map(
            (i) => i.amount as bigint
          )
        )
      ).toBe(q.total_amount as bigint);
  });
  test("settlement items sum to the settlement total", () => {
    for (const s of SETTLEMENTS)
      expect(
        sum(
          SETTLEMENT_ITEMS.filter((i) => i.settlement_id === s.id).map(
            (i) => i.amount as bigint
          )
        )
      ).toBe(s.total_amount as bigint);
  });
  test("a signed settlement's bill carries its total and its whole schedule", () => {
    for (const s of SETTLEMENTS.filter((x) => x.status === "signed")) {
      const bill = BILLS.find((b) => b.settlement_id === s.id);
      expect(bill?.total_amount).toBe(s.total_amount as bigint);
      // Signing sweeps every cọc onto the bill, so nothing stays unallocated.
      expect(
        MILESTONES.filter((m) => m.project_id === s.project_id && !m.bill_id)
      ).toEqual([]);
      expect(
        sum(
          MILESTONES.filter((m) => m.bill_id === bill?.id).map(
            (m) => m.amount as bigint
          )
        )
      ).toBe(bill?.total_amount as bigint);
    }
  });
  test("the closed project is fully collected", () => {
    const bill = BILLS.find((b) => b.project_id === 3);
    const collected = sum(
      MILESTONES.filter(
        (m) => m.bill_id === bill?.id && m.status === "paid"
      ).map((m) => m.amount as bigint)
    );
    expect(collected).toBe(bill?.total_amount as bigint);
  });
});

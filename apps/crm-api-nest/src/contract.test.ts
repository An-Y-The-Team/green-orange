// Contract-critical pure logic, unit-tested without a DB (bun test). The full
// HTTP roundtrip is the curl smoke check in the README's verify section.
import { Prisma } from "@prisma/client";
import { describe, expect, test } from "bun:test";

import { formatCode } from "./common/code";
import { toBig } from "./common/coerce";
import { normalize } from "./common/serialize.interceptor";
import { shouldAdvance } from "./common/stage";

describe("formatCode", () => {
  test("first sequence is CT-2026-001", () => {
    expect(formatCode("CT", 1)).toBe("CT-2026-001");
  });
  test("pads to 3 digits, keeps prefix", () => {
    expect(formatCode("BG", 12)).toBe("BG-2026-012");
    expect(formatCode("HD", 5)).toBe("HD-2026-005");
  });
});

describe("normalize (serialization contract)", () => {
  test("BigInt VND → JSON number", () => {
    expect(normalize({ value: 120_000_000n })).toEqual({ value: 120_000_000 });
  });
  test("*_date columns → YYYY-MM-DD", () => {
    expect(normalize({ start_date: new Date("2026-06-01T00:00:00Z") })).toEqual(
      {
        start_date: "2026-06-01",
      }
    );
  });
  test("*_at timestamps keep their time (appointments are same-day)", () => {
    expect(
      normalize({ appointment_at: new Date("2026-07-20T02:00:00.000Z") })
    ).toEqual({ appointment_at: "2026-07-20T02:00:00.000Z" });
  });
  test("Prisma Decimal (quantity, hours) → JSON number", () => {
    expect(normalize({ hours: new Prisma.Decimal("7.5") })).toEqual({
      hours: 7.5,
    });
  });
  test("walks arrays and nested objects (Quote.items)", () => {
    expect(
      normalize([{ items: [{ unit_price: 5_000_000n, quantity: 2 }] }])
    ).toEqual([{ items: [{ unit_price: 5_000_000, quantity: 2 }] }]);
  });
  test("passes null/undefined/strings through", () => {
    expect(normalize({ a: null, b: undefined, c: "x", d: 3 })).toEqual({
      a: null,
      b: undefined,
      c: "x",
      d: 3,
    });
  });
});

describe("toBig", () => {
  test("number → BigInt, null/undefined → null", () => {
    expect(toBig(500)).toBe(500n);
    expect(toBig(null)).toBeNull();
    expect(toBig(undefined)).toBeNull();
  });
});

describe("shouldAdvance (forward-only auto-advance)", () => {
  test("advances when target is ahead", () => {
    expect(shouldAdvance("request", "quote")).toBe(true);
  });
  test("never moves backward", () => {
    expect(shouldAdvance("execution", "quote")).toBe(false);
  });
  test("same stage is a no-op", () => {
    expect(shouldAdvance("quote", "quote")).toBe(false);
  });
  test("closed projects never auto-advance", () => {
    expect(shouldAdvance("closed", "settlement")).toBe(false);
  });
});

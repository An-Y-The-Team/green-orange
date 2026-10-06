// What must not regress: every spelling of the same Vietnamese number maps to
// one canonical "0…" form (it is the login identity), and junk maps to null
// rather than a bogus identity.
import { describe, expect, test } from "bun:test";

import { normalizePhone, toLocalPhone } from "./phone";

describe("normalizePhone", () => {
  test("accepts the canonical local form unchanged", () => {
    expect(normalizePhone("0912345678")).toBe("0912345678");
  });

  test("converts the 84 country prefix to local 0", () => {
    expect(normalizePhone("84912345678")).toBe("0912345678");
    expect(normalizePhone("+84 912-345-678")).toBe("0912345678");
  });

  test("strips separators and whitespace", () => {
    expect(normalizePhone("0912 345 678")).toBe("0912345678");
    expect(normalizePhone("091-234-5678")).toBe("0912345678");
  });

  test("rejects junk, wrong lengths, and empty input", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("091234567890")).toBeNull(); // too long
    expect(normalizePhone("912345678")).toBeNull(); // 9 digits, no prefix
    expect(normalizePhone("not a phone")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

// The write-path half. normalizePhone was only ever applied on the way OUT (at
// login); nothing normalized on the way IN, so a roster row saved as
// "0912 345 678" — the exact format the crm-web placeholder showed — could
// never be matched by the exact findUnique in auth.service.ts. The worker was
// told their number was not registered and the operator saw nothing wrong.
describe("toLocalPhone (the crew write path)", () => {
  const t = (value: unknown) => toLocalPhone({ value });

  test("stores the canonical form whatever the operator typed", () => {
    expect(t("0912345678")).toBe("0912345678");
    expect(t("0912 345 678")).toBe("0912345678");
    expect(t("+84 912-345-678")).toBe("0912345678");
    expect(t("84912345678")).toBe("0912345678");
  });

  // An absent key on a PATCH must leave the column alone; an explicitly cleared
  // field must null it, the same thing the migration did to ''.
  test("absent means leave alone, empty means clear", () => {
    expect(t(undefined)).toBeUndefined();
    expect(t("")).toBeNull();
    expect(t(null)).toBeNull();
  });

  // Load-bearing: returning null for junk would make @IsOptional skip the
  // validator and silently DROP the number instead of answering 400. The raw
  // value has to survive so @Matches can reject it.
  test("unparseable input comes back raw so the validator can reject it", () => {
    expect(t("12345")).toBe("12345");
    expect(t("khong co so")).toBe("khong co so");
    expect(t("091234567890")).toBe("091234567890");
  });

  test("a landline-length number is not silently accepted", () => {
    expect(t("02838221234")).toBe("02838221234"); // 11 digits → rejected upstream
  });
});

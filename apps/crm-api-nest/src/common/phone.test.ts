// What must not regress: every spelling of the same Vietnamese number maps to
// one canonical "0…" form (it is the login identity), and junk maps to null
// rather than a bogus identity.
import { describe, expect, test } from "bun:test";

import { normalizePhone } from "./phone";

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

// Document codes: {PREFIX}-{year}-{NNN}, restarting each January.
// The year is a parameter, so the January rollover is testable without a clock.
//
// Twin of crm-api's `tests/test_codes.py` (the pure half). If one of these
// changes, the Python one changes with it — the two backends must never issue
// different codes for the same table.
import { describe, expect, test } from "bun:test";

import { formatCode, nextSequence, parseSequence } from "./code";

describe("formatCode", () => {
  test("pads the sequence to three digits", () => {
    expect(formatCode("CT", 2026, 1)).toBe("CT-2026-001");
    expect(formatCode("HD", 2027, 12)).toBe("HD-2027-012");
  });

  test("grows past 999 rather than wrapping", () => {
    // Three digits is a minimum width. The 1000th document keeps its number.
    expect(formatCode("CT", 2026, 1000)).toBe("CT-2026-1000");
  });
});

describe("parseSequence", () => {
  test("reads back what formatCode wrote", () => {
    expect(parseSequence(formatCode("CT", 2026, 7), "CT", 2026)).toBe(7);
  });

  test("rejects another prefix or another year", () => {
    // A hợp đồng number must never raise the công trình counter, and last
    // year's codes must never raise this year's. This is the whole ticket.
    expect(parseSequence("HD-2026-007", "CT", 2026)).toBeNull();
    expect(parseSequence("CT-2025-007", "CT", 2026)).toBeNull();
    expect(parseSequence("CT-2026-007", "CT", 2027)).toBeNull();
  });

  test("survives junk instead of throwing", () => {
    // Codes get hand-edited and predate this function. One bad row must not
    // stop anyone from creating a công trình.
    for (const junk of ["", "CT", "CT-2026", "CT-2026-abc", "CT-20xx-001"]) {
      expect(parseSequence(junk, "CT", 2026)).toBeNull();
    }
  });
});

describe("nextSequence", () => {
  test("starts at one when nothing was issued", () => {
    expect(nextSequence([], "CT", 2026)).toBe(1);
  });

  test("continues from the highest code issued", () => {
    // Unordered on purpose: it is the MAXIMUM, not the last one seen.
    const codes = ["CT-2026-001", "CT-2026-003", "CT-2026-002"];
    expect(nextSequence(codes, "CT", 2026)).toBe(4);
  });

  test("ignores other prefixes, other years and junk", () => {
    const codes = [
      "CT-2026-001",
      "HD-2026-009",
      "CT-2025-042",
      "CT-2027-005",
      "rác",
    ];
    expect(nextSequence(codes, "CT", 2026)).toBe(2);
  });

  test("restarts at one in the new year", () => {
    // The rollover test, and it needs no clock: the year is an argument.
    const codes = ["CT-2026-001", "CT-2026-002", "CT-2026-003"];
    expect(nextSequence(codes, "CT", 2027)).toBe(1);
  });

  test("is not a row count", () => {
    // One row, numbered 5 → the next is 6. Counting rows would answer 2, and
    // counting ids is what the old implementation did.
    expect(nextSequence(["CT-2026-005"], "CT", 2026)).toBe(6);
  });

  test("reuses a deleted tail, matching the documented policy", () => {
    // CT-2026-003 was created and then deleted. A deleted tail is reused
    // because the database stores no issuance ledger. Same decision as Python.
    expect(nextSequence(["CT-2026-001", "CT-2026-002"], "CT", 2026)).toBe(3);
  });
});

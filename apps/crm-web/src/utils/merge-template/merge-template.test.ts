import { expect, test } from "vitest";

import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import { doc, mf, p, t } from "@/utils/lexical-build/lexical-build";

import {
  CONTRACT_TOKENS,
  QUOTE_TOKENS,
  SIGNED_TOKENS,
  buildContractContext,
  buildQuoteContext,
  previewContext,
  signedContext,
  unknownTokens,
  unresolvedMarker,
} from "./merge-template";

// CONTRACT_TOKENS is the whitelist AND the editor palette, so every entry must
// resolve — a token the palette offers but the context can't fill would print
// ⟨token?⟩ on a signed contract.
test("every token in CONTRACT_TOKENS resolves in the preview context", () => {
  const ctx = previewContext();
  for (const { token } of CONTRACT_TOKENS) {
    expect(ctx, `preview context is missing ${token}`).toHaveProperty(token);
    expect(ctx[token], `preview example for ${token} is empty`).not.toBe("");
  }
});

test("every token in CONTRACT_TOKENS resolves against a real contract", () => {
  const ctx = buildContractContext({
    contract: {
      id: 1,
      project_id: 7,
      code: "HD-2026-001",
      status: ContractStatus.SIGNED,
      signed_date: "2026-03-10",
      note: "Ký tại văn phòng BQL.",
      project: {
        id: 7,
        code: "CT-2026-001",
        name: "Vệ sinh kính Vincom",
        client: { id: 9, name: "Vincom Retail" },
      },
    },
    quote: { total_amount: 36_000_000, vat_rate: 0.08 },
  });

  for (const { token } of CONTRACT_TOKENS) {
    expect(ctx, `contract context is missing ${token}`).toHaveProperty(token);
  }
  // Spot-check the derived money tokens (total_amount is before VAT).
  expect(ctx.value_before_tax).toContain("36.000.000");
  expect(ctx.value).toContain("38.880.000");
  expect(ctx.vat_rate).toBe("8%");
});

// Same invariant for the báo giá terms block: QUOTE_TOKENS is its palette, and
// a chip the context can't fill prints ⟨token?⟩ on a customer-facing sheet.
test("every token in QUOTE_TOKENS resolves against a real quote", () => {
  const ctx = buildQuoteContext({
    quote: {
      total_amount: 36_000_000,
      vat_rate: 0.08,
      project: {
        code: "CT-2026-001",
        name: "Vệ sinh kính Vincom",
        client: { name: "Vincom Retail" },
      },
    },
  });

  for (const { token } of QUOTE_TOKENS) {
    expect(ctx, `quote context is missing ${token}`).toHaveProperty(token);
  }
  expect(ctx.value_before_tax).toContain("36.000.000");
  expect(ctx.value).toContain("38.880.000");
  expect(ctx.vat_rate).toBe("8%");
  expect(ctx.client).toBe("Vincom Retail");
});

// A standalone quote has no project: those chips resolve empty, never a marker.
test("QUOTE_TOKENS resolve to empty strings without a project", () => {
  const ctx = buildQuoteContext({
    quote: { total_amount: 0, vat_rate: 0.08 },
  });
  expect(ctx.project_code).toBe("");
  expect(ctx.project_name).toBe("");
  expect(ctx.client).toBe("");
});

test("no whitelisted token is reported unknown", () => {
  const body = doc(p(...CONTRACT_TOKENS.map((token) => mf(token.token))));
  expect(unknownTokens(body)).toEqual([]);
});

// The nine tokens F38 removed. A body authored before the branch still holds
// them, and they used to print silently as ⟨client_address?⟩.
test("a retired token is reported, deduplicated", () => {
  const body = doc(
    p(t("Địa chỉ: "), mf("client_address")),
    p(t("MST: "), mf("client_tax_code"), t(" / "), mf("client_address"))
  );
  expect(unknownTokens(body)).toEqual(["client_address", "client_tax_code"]);
});

test("finds tokens nested in tables and lists, not just top-level paragraphs", () => {
  const body = JSON.stringify({
    root: {
      type: "root",
      children: [
        {
          type: "table",
          children: [
            {
              type: "tablerow",
              children: [
                {
                  type: "tablecell",
                  children: [{ type: "paragraph", children: [mf("bogus")] }],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  expect(unknownTokens(body)).toEqual(["bogus"]);
});

test("unparsable or empty body reports nothing (the schema rejects it first)", () => {
  expect(unknownTokens("not json")).toEqual([]);
  expect(unknownTokens("")).toEqual([]);
  expect(unknownTokens(doc(p(t("Không có trường trộn."))))).toEqual([]);
});

test("the unresolved marker is the ⟨token?⟩ form the renderer shows", () => {
  expect(unresolvedMarker("client_address")).toBe("⟨client_address?⟩");
});

// A signed contract must reprint as it was signed: these tokens resolve from the
// client / location / project rows, which stay editable afterwards, so signing
// freezes them into the print snapshot (print-snapshot.ts) and the print page
// layers them back over the live values.
test("signedContext freezes every token that reads a mutable related row", () => {
  const frozen = signedContext(previewContext());

  expect(Object.keys(frozen).sort()).toEqual([...SIGNED_TOKENS].sort());
  expect(frozen["client.address"]).toBe(
    CONTRACT_TOKENS.find((t) => t.token === "client.address")?.example
  );
  // company.* is the snapshot's own job; money comes from the frozen chốt quote.
  expect(frozen).not.toHaveProperty(["company.name"]);
  expect(frozen).not.toHaveProperty("value");
});

test("signedContext fills a missing token with an empty string, not undefined", () => {
  const frozen = signedContext({});

  for (const token of SIGNED_TOKENS) expect(frozen[token]).toBe("");
});

import { describe, expect, it } from "vitest";

import { flattenFieldErrors } from "./form-error-summary";

describe("flattenFieldErrors", () => {
  it("reads a top-level field error", () => {
    expect(
      flattenFieldErrors({
        project_name: { type: "too_small", message: "Nhập tên công trình" },
      })
    ).toEqual([["project_name", "Nhập tên công trình"]]);
  });

  // The reason the walk exists: a line-item error is nested two levels down,
  // and a flat Object.entries shows nothing for the builders.
  it("reaches a field-array row", () => {
    expect(
      flattenFieldErrors({
        items: [
          undefined,
          { description: { type: "too_small", message: "Nhập nội dung" } },
        ],
      })
    ).toEqual([["items.1.description", "Nhập nội dung"]]);
  });

  // `ref` is a live DOM node on every RHF error leaf; recursing into one walks
  // the document instead of the form.
  it("never walks into a ref", () => {
    const ref = { name: "vat_rate", ownerDocument: { message: "boom" } };
    expect(
      flattenFieldErrors({ vat_rate: { message: "Sai thuế", ref } })
    ).toEqual([["vat_rate", "Sai thuế"]]);
    expect(flattenFieldErrors({ items: { ref } })).toEqual([]);
  });
});

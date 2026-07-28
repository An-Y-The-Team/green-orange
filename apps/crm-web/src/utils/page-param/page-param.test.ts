import { expect, test } from "vitest";

import { pageFromParam, pageQuery } from "./page-param";

// The failure these guard: a junk `?page=` reaching the API as a negative or
// fractional offset (silently clamped, so the list quietly shows page 1's rows
// while the pager claims otherwise).
test("a valid page number passes through", () => {
  expect(pageFromParam("3")).toBe(3);
});

test("junk floors to page 1", () => {
  for (const raw of [undefined, "", "0", "-2", "1.5", "abc", "NaN"]) {
    expect(pageFromParam(raw)).toBe(1);
  }
});

test("a repeated query key takes the first value", () => {
  expect(pageFromParam(["2", "9"])).toBe(2);
});

test("pageQuery omits unset and zero values so the API keeps its defaults", () => {
  expect(pageQuery({})).toBe("");
  expect(pageQuery({ offset: 0 })).toBe("");
  expect(pageQuery({ limit: 101 })).toBe("?limit=101");
  expect(pageQuery({ limit: 101, offset: 100 })).toBe("?limit=101&offset=100");
});

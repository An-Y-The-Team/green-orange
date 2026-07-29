import { expect, test } from "vitest";

import { pageCount, pageFromParam, pageQuery } from "./page-param";

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

// The failure these guard: the pager derives "is there a next page" from the
// collection total now (it used to fetch PAGE_ROWS + 1 rows to find out), so an
// off-by-one is a dead Sau button — rows the user can never reach.
test("a partial last page still counts as a page", () => {
  expect(pageCount({ total: 101, pageRows: 100 })).toBe(2);
  expect(pageCount({ total: 200, pageRows: 100 })).toBe(2);
  expect(pageCount({ total: 201, pageRows: 100 })).toBe(3);
});

// An empty list is one empty page, so the pager can hide itself with a single
// `pages === 1` check instead of a separate "is it empty" branch.
test("an empty collection is one page, never zero", () => {
  expect(pageCount({ total: 0, pageRows: 100 })).toBe(1);
  expect(pageCount({ total: 100, pageRows: 100 })).toBe(1);
});

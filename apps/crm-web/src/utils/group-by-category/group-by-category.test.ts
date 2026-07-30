import { expect, test } from "vitest";

import { groupByCategory } from "./group-by-category";

test("consecutive items sharing a category become one section", () => {
  expect(
    groupByCategory([
      { category: "A. VẬT TƯ" },
      { category: "A. VẬT TƯ" },
      { category: "B. NHÂN CÔNG" },
    ])
  ).toEqual([
    { category: "A. VẬT TƯ", indices: [0, 1] },
    { category: "B. NHÂN CÔNG", indices: [2] },
  ]);
});

// The bug this guards: grouping by a Map/Set instead of by runs would pull row 2
// up next to row 0 and silently reorder a quote the author laid out by hand.
test("a category that comes back later is a second section, not a merge", () => {
  expect(
    groupByCategory([{ category: "A" }, { category: "B" }, { category: "A" }])
  ).toEqual([
    { category: "A", indices: [0] },
    { category: "B", indices: [1] },
    { category: "A", indices: [2] },
  ]);
});

test("an ungrouped quote is one unnamed section (null, blank and missing alike)", () => {
  expect(groupByCategory([{ category: null }, { category: "  " }, {}])).toEqual(
    [{ category: "", indices: [0, 1, 2] }]
  );
});

test("no items → no sections", () => {
  expect(groupByCategory([])).toEqual([]);
  expect(groupByCategory(undefined)).toEqual([]);
});

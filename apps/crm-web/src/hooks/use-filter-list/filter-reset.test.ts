import { expect, test, vi } from "vitest";

import { filterReset } from "./filter-reset";

type Params = { search: string; status: string[]; type: string[] };

const defaults: Params = {
  search: "",
  status: ["active", "on_hold"],
  type: [],
};

const at = (params: Params) =>
  filterReset({
    params,
    defaults,
    keys: ["search", "status", "type"] as const,
    apply: () => {},
  });

test("defaults mean no filters are active", () => {
  expect(at({ ...defaults }).hasFilters).toBe(false);
  // A different array INSTANCE holding the same values is still the default —
  // comparing with === here would make every list claim to be filtered.
  expect(at({ ...defaults, status: ["active", "on_hold"] }).hasFilters).toBe(
    false
  );
});

test("a MultiSelect returning the same set in another order is not a change", () => {
  expect(at({ ...defaults, status: ["on_hold", "active"] }).hasFilters).toBe(
    false
  );
});

test("a real change is detected", () => {
  expect(at({ ...defaults, search: "an phat" }).hasFilters).toBe(true);
  expect(at({ ...defaults, status: ["active"] }).hasFilters).toBe(true);
  expect(at({ ...defaults, status: [] }).hasFilters).toBe(true);
  expect(at({ ...defaults, type: ["company"] }).hasFilters).toBe(true);
});

test("clearing applies every filter key's default, and nothing else", () => {
  const apply = vi.fn();
  filterReset({
    params: { search: "x", status: ["active"], type: ["company"] },
    defaults,
    keys: ["search", "status"] as const,
    apply,
  }).clearFilters();
  // `type` is not in `keys`, so it is left alone — the caller decides which
  // params count as filters.
  expect(apply).toHaveBeenCalledWith({
    search: "",
    status: ["active", "on_hold"],
  });
});

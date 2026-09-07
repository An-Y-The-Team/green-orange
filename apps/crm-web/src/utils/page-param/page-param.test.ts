import { expect, test } from "vitest";

import { pageQuery } from "./page-param";

// The failure this guards: a `?limit=`/`?offset=` suffix that sends zeros
// explicitly overrides the API's own defaults (DEFAULT_PAGE_SIZE = 100) with
// nothing, so the list came back empty.
test("pageQuery omits unset and zero values so the API keeps its defaults", () => {
  expect(pageQuery({})).toBe("");
  expect(pageQuery({ offset: 0 })).toBe("");
  expect(pageQuery({ limit: 101 })).toBe("?limit=101");
  expect(pageQuery({ limit: 101, offset: 100 })).toBe("?limit=101&offset=100");
});

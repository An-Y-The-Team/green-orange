import { describe, expect, test } from "vitest";

import { quoteHref, quotePrintHref } from "./quote-href";

describe("quoteHref", () => {
  test("a project quote lives inside its công trình", () => {
    expect(quoteHref({ id: 31, project_id: 14 })).toBe(
      "/projects/14/quotes/31"
    );
    expect(quotePrintHref({ id: 31, project_id: 14 })).toBe(
      "/projects/14/quotes/31/print"
    );
  });

  test("a standalone quote keeps its own page", () => {
    expect(quoteHref({ id: 7, project_id: null })).toBe("/quotes/7");
    expect(quotePrintHref({ id: 7, project_id: null })).toBe("/quotes/7/print");
  });
});

import { describe, expect, test } from "vitest";

import { contractHref } from "./contract-href";

describe("contractHref", () => {
  test("a project contract lives inside its công trình", () => {
    expect(contractHref({ id: 7, project_id: 14 })).toBe(
      "/projects/14/contracts/7"
    );
  });

  test("a standalone contract keeps its own page", () => {
    expect(contractHref({ id: 3, project_id: null })).toBe("/contracts/3");
  });
});

import { describe, expect, it } from "vitest";

import { cleanUrlParams } from "./clean-url-params";

const params = (init: Record<string, string> = {}) => new URLSearchParams(init);
const obj = (p: URLSearchParams) => Object.fromEntries(p.entries());

describe("cleanUrlParams", () => {
  it("drops empty / nullish values", () => {
    const result = cleanUrlParams(params({ keep: "x" }), {
      a: "",
      b: undefined,
      c: null as unknown as string,
      keep: "x",
    }, {} as Record<string, string>);
    expect(obj(result)).toEqual({ keep: "x" });
  });

  it("strips a scalar param equal to its default", () => {
    const result = cleanUrlParams(params(), { size: "10" }, { size: "10" });
    expect(result.has("size")).toBe(false);
  });

  it("keeps a scalar param that differs from its default", () => {
    const result = cleanUrlParams(params(), { size: "25" }, { size: "10" });
    expect(result.get("size")).toBe("25");
  });

  it("strips an array equal to its default regardless of order (deep-equal)", () => {
    const result = cleanUrlParams(
      params({ tags: JSON.stringify(["b", "a"]) }),
      { tags: ["b", "a"] as unknown as string },
      { tags: ["a", "b"] as unknown as string }
    );
    expect(result.has("tags")).toBe(false);
  });

  it("keeps an array that differs from its default", () => {
    const result = cleanUrlParams(
      params(),
      { tags: ["a", "c"] as unknown as string },
      { tags: ["a", "b"] as unknown as string }
    );
    expect(result.get("tags")).toBe(JSON.stringify(["a", "c"]));
  });

  it("strips object fields equal to their default, keeping the rest", () => {
    const result = cleanUrlParams(
      params(),
      { f: { min: 5, max: 10 } as unknown as string },
      { f: { min: 5, max: 99 } as unknown as string }
    );
    // min matches default → stripped; max differs → kept
    expect(JSON.parse(result.get("f")!)).toEqual({ max: 10 });
  });
});

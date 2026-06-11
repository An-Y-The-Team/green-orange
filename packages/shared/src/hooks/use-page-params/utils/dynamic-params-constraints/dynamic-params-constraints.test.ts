import { describe, expect, it } from "vitest";

import { arraySubsetOf, cap, oneOf } from "./dynamic-params-constraints";

describe("cap", () => {
  describe("happy path", () => {
    it("should accept a value within [1, max]", () => {
      const constraint = cap(5);
      expect(constraint.ready).toBe(true);
      expect(constraint.check(3)).toBe(true);
    });

    it("should accept the lower bound (1)", () => {
      expect(cap(5).check(1)).toBe(true);
    });

    it("should accept the upper bound (max)", () => {
      expect(cap(5).check(5)).toBe(true);
    });

    it("should correct an out-of-range value to the nearest bound", () => {
      const constraint = cap(5);
      expect(constraint.correct(10)).toBe(5);
      expect(constraint.correct(0)).toBe(1);
      expect(constraint.correct(-3)).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should mark as not ready when max is undefined", () => {
      const constraint = cap(undefined);
      expect(constraint.ready).toBe(false);
      expect(constraint.check(999)).toBe(true); // always passes when not ready
      expect(constraint.correct(999)).toBe(999); // identity when not ready
    });

    it("should handle max === 0 (empty result set): only reject values > 1", () => {
      const constraint = cap(0);
      expect(constraint.ready).toBe(true);
      expect(constraint.check(1)).toBe(true);
      expect(constraint.check(2)).toBe(false);
      expect(constraint.correct(2)).toBe(1);
      // page=0 passes through (schema enforces min(1) separately)
      expect(constraint.check(0)).toBe(true);
    });

    it("should handle max === 1 (single page)", () => {
      const constraint = cap(1);
      expect(constraint.check(1)).toBe(true);
      expect(constraint.check(2)).toBe(false);
      expect(constraint.correct(2)).toBe(1);
    });

    it("should handle max negative (treated same as max <= 0)", () => {
      const constraint = cap(-5);
      expect(constraint.ready).toBe(true);
      expect(constraint.check(1)).toBe(true);
      expect(constraint.check(2)).toBe(false);
    });

    it("should handle very large page number", () => {
      const constraint = cap(10);
      expect(constraint.check(99999)).toBe(false);
      expect(constraint.correct(99999)).toBe(10);
    });

    it("should return max === 1 when correct is called with value below 1 and max >= 1", () => {
      expect(cap(3).correct(-100)).toBe(1);
    });
  });

  describe("parameter manipulation", () => {
    it("should coerce numeric string in check/correct (JavaScript comparison rules)", () => {
      const constraint = cap(5);
      expect(constraint.check("3" as unknown as number)).toBe(true);
      expect(constraint.correct("10" as unknown as number)).toBe(5);
    });

    it("should reject non-numeric string in check", () => {
      expect(cap(5).check("x" as unknown as number)).toBe(false);
    });

    it("should propagate NaN through correct when max is positive", () => {
      expect(Number.isNaN(cap(5).correct(Number.NaN))).toBe(true);
    });

    it("should reject NaN in check when max is positive", () => {
      expect(cap(5).check(Number.NaN)).toBe(false);
    });

    it("should return NaN from correct when max <= 0 and value is NaN", () => {
      expect(Number.isNaN(cap(0).correct(Number.NaN))).toBe(true);
    });

    it("should treat null as 0 in check and correct (numeric coercion)", () => {
      const constraint = cap(5);
      expect(constraint.check(null as unknown as number)).toBe(false);
      expect(constraint.correct(null as unknown as number)).toBe(1);
    });

    it("should treat undefined as NaN in check and correct", () => {
      const constraint = cap(5);
      expect(constraint.check(undefined as unknown as number)).toBe(false);
      expect(
        Number.isNaN(constraint.correct(undefined as unknown as number))
      ).toBe(true);
    });

    it("should treat object as NaN in check and correct", () => {
      const constraint = cap(5);
      expect(constraint.check({} as unknown as number)).toBe(false);
      expect(Number.isNaN(constraint.correct({} as unknown as number))).toBe(
        true
      );
    });
  });
});

describe("oneOf", () => {
  describe("happy path", () => {
    it("should accept a value present in allowed list", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.ready).toBe(true);
      expect(constraint.check("asc")).toBe(true);
      expect(constraint.check("desc")).toBe(true);
    });

    it("should reject a value not in allowed list", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.check("random")).toBe(false);
    });

    it("should correct an invalid value to the fallback", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.correct("random")).toBe("asc");
    });

    it("should leave a valid value unchanged when correcting", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.correct("desc")).toBe("desc");
    });
  });

  describe("edge cases", () => {
    it("should mark as not ready when allowed is undefined", () => {
      const constraint = oneOf<string>(undefined, "asc");
      expect(constraint.ready).toBe(false);
      expect(constraint.check("anything")).toBe(true);
      expect(constraint.correct("anything")).toBe("anything");
    });

    it("should treat fallback as the only valid value when allowed is empty array", () => {
      const constraint = oneOf<string>([], "asc");
      expect(constraint.ready).toBe(true);
      // fallback is the only valid value when allowed is empty
      expect(constraint.check("asc")).toBe(true);
      expect(constraint.check("desc")).toBe(false);
      expect(constraint.correct("anything")).toBe("asc");
    });

    it("should handle single-element allowed list", () => {
      const constraint = oneOf(["only"], "only");
      expect(constraint.check("only")).toBe(true);
      expect(constraint.check("other")).toBe(false);
      expect(constraint.correct("other")).toBe("only");
    });

    it("should work with number types", () => {
      const constraint = oneOf([10, 25, 50], 10);
      expect(constraint.check(25)).toBe(true);
      expect(constraint.check(99)).toBe(false);
      expect(constraint.correct(99)).toBe(10);
    });

    it("should check by strict equality (no coercion)", () => {
      const constraint = oneOf(["10", "25"], "10");
      expect(constraint.check(10 as unknown as string)).toBe(false);
    });
  });

  describe("parameter manipulation", () => {
    it("should reject null when allowed is string list", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.check(null as unknown as string)).toBe(false);
      expect(constraint.correct(null as unknown as string)).toBe("asc");
    });

    it("should reject undefined when allowed is string list", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.check(undefined as unknown as string)).toBe(false);
      expect(constraint.correct(undefined as unknown as string)).toBe("asc");
    });

    it("should reject empty string when not in allowed", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.check("")).toBe(false);
      expect(constraint.correct("")).toBe("asc");
    });

    it("should reject value that only differs by whitespace", () => {
      const constraint = oneOf(["asc", "desc"], "asc");
      expect(constraint.check(" asc")).toBe(false);
      expect(constraint.correct(" desc ")).toBe("asc");
    });

    it("should reject wrong runtime type (number for string union)", () => {
      const constraint = oneOf(["10", "25"], "10");
      expect(constraint.check(10 as unknown as string)).toBe(false);
      expect(constraint.correct(25 as unknown as string)).toBe("10");
    });

    it("should use fallback for object not in allowed (reference equality)", () => {
      const a = { id: "1" };
      const b = { id: "1" };
      const constraint = oneOf([a], a);
      expect(constraint.check(b)).toBe(false);
      expect(constraint.correct(b)).toBe(a);
    });

    it("should accept object same reference as in allowed", () => {
      const item = { id: "1" };
      const constraint = oneOf([item], item);
      expect(constraint.check(item)).toBe(true);
      expect(constraint.correct(item)).toBe(item);
    });
  });
});

describe("arraySubsetOf", () => {
  describe("happy path", () => {
    it("should accept an array where all elements are in allowed", () => {
      const constraint = arraySubsetOf(["a", "b", "c"]);
      expect(constraint.ready).toBe(true);
      expect(constraint.check(["a", "b"])).toBe(true);
    });

    it("should accept an empty array (trivially a subset)", () => {
      expect(arraySubsetOf(["a", "b"]).check([])).toBe(true);
    });

    it("should reject an array containing a disallowed element", () => {
      expect(arraySubsetOf(["a", "b"]).check(["a", "z"])).toBe(false);
    });

    it("should correct by filtering out disallowed elements (order preserved)", () => {
      const constraint = arraySubsetOf(["a", "b", "c"]);
      expect(constraint.correct(["b", "z", "a"])).toEqual(["b", "a"]);
    });

    it("should return empty array when all elements are disallowed", () => {
      expect(arraySubsetOf(["a", "b"]).correct(["x", "y"])).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should mark as not ready when allowed is undefined", () => {
      const constraint = arraySubsetOf(undefined);
      expect(constraint.ready).toBe(false);
      expect(constraint.check(["anything"])).toBe(true);
      expect(constraint.correct(["anything"])).toEqual(["anything"]);
    });

    it("should handle empty allowed list (every value is disallowed)", () => {
      const constraint = arraySubsetOf([]);
      expect(constraint.ready).toBe(true);
      expect(constraint.check(["a"])).toBe(false);
      expect(constraint.correct(["a"])).toEqual([]);
    });

    it("should handle null/undefined value via nullish fallback", () => {
      const constraint = arraySubsetOf(["a", "b"]);
      expect(constraint.check(null as unknown as string[])).toBe(true); // (null ?? []) = []
      expect(constraint.correct(null as unknown as string[])).toEqual([]);
    });

    it("should handle readonly allowed array", () => {
      const allowed = ["x", "y"] as const;
      const constraint = arraySubsetOf(allowed);
      expect(constraint.check(["x"])).toBe(true);
      expect(constraint.check(["z"])).toBe(false);
    });
  });

  describe("parameter manipulation", () => {
    it("should throw when value is a plain string (not an array)", () => {
      const constraint = arraySubsetOf(["a", "b"]);
      expect(() => constraint.check("a" as unknown as string[])).toThrow(
        TypeError
      );
      expect(() => constraint.correct("a" as unknown as string[])).toThrow(
        TypeError
      );
    });

    it("should throw when value is a number", () => {
      const constraint = arraySubsetOf(["a", "b"]);
      expect(() => constraint.check(1 as unknown as string[])).toThrow(
        TypeError
      );
      expect(() => constraint.correct(1 as unknown as string[])).toThrow(
        TypeError
      );
    });

    it("should throw when value is a plain object", () => {
      const constraint = arraySubsetOf(["a", "b"]);
      expect(() => constraint.check({ 0: "a" } as unknown as string[])).toThrow(
        TypeError
      );
      expect(() =>
        constraint.correct({ 0: "a" } as unknown as string[])
      ).toThrow(TypeError);
    });

    it("should handle array-like object with numeric keys (no .every)", () => {
      const constraint = arraySubsetOf(["a", "b"]);
      const arrayLike = { 0: "a", 1: "b", length: 2 };
      expect(() => constraint.check(arrayLike as unknown as string[])).toThrow(
        TypeError
      );
    });

    it("should preserve special characters in elements when allowed", () => {
      const constraint = arraySubsetOf(["a\n", "b\t"]);
      expect(constraint.check(["a\n"])).toBe(true);
      expect(constraint.correct(["a\n", "x"])).toEqual(["a\n"]);
    });

    it("should handle very long single token in allowed list", () => {
      const long = "x".repeat(10_000);
      const constraint = arraySubsetOf([long, "b"]);
      expect(constraint.check([long])).toBe(true);
      expect(constraint.correct([long, "nope"])).toEqual([long]);
    });
  });
});

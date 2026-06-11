import { describe, expect, it } from "vitest";

import type { Constraint } from "../../types";
import { evaluateConstraints } from "./evaluate-dynamic-params-constraints";

// Helper: build a simple leaf constraint
const makeConstraint = <V>(
  isValid: (v: V) => boolean,
  correction: V
): Constraint<V> => ({
  ready: true,
  check: isValid,
  correct: () => correction,
});

const notReadyConstraint = <V>(): Constraint<V> => ({
  ready: false,
  check: () => true,
  correct: (v) => v,
});

describe("evaluateConstraints", () => {
  describe("happy path", () => {
    it("should return params unchanged when all constraints pass", () => {
      const params = { page: 2 };
      const result = evaluateConstraints(params, {
        page: makeConstraint((v) => v >= 1 && v <= 5, 1),
      });
      expect(result.needsCorrection).toBe(false);
      expect(result.corrected).toEqual({ page: 2 });
    });

    it("should correct a field that fails its constraint", () => {
      const params = { page: 10 };
      const result = evaluateConstraints(params, {
        page: makeConstraint((v) => v <= 5, 5),
      });
      expect(result.needsCorrection).toBe(true);
      expect(result.corrected).toEqual({ page: 5 });
    });

    it("should correct multiple fields independently", () => {
      const params = { page: 10, perPage: 999 };
      const result = evaluateConstraints(params, {
        page: makeConstraint((v) => v <= 5, 5),
        perPage: makeConstraint((v) => v <= 50, 25),
      });
      expect(result.needsCorrection).toBe(true);
      expect(result.corrected).toEqual({ page: 5, perPage: 25 });
    });

    it("should handle nested constraints", () => {
      const params = { table: { page: 10, perPage: 25 } };
      const result = evaluateConstraints(params, {
        table: {
          page: makeConstraint((v) => v <= 5, 5),
        },
      });
      expect(result.needsCorrection).toBe(true);
      expect(result.corrected).toEqual({ table: { page: 5, perPage: 25 } });
    });
  });

  describe("edge cases", () => {
    it("should skip a not-ready constraint", () => {
      const params = { page: 999 };
      const result = evaluateConstraints(params, {
        page: notReadyConstraint<number>(),
      });
      expect(result.needsCorrection).toBe(false);
      expect(result.corrected).toEqual({ page: 999 });
    });

    it("should skip constraints with undefined value in constraints map", () => {
      const params = { page: 1 };
      const result = evaluateConstraints(params, {
        page: undefined,
      });
      expect(result.needsCorrection).toBe(false);
    });

    it("should return needsCorrection=false when constraints is empty", () => {
      const params = { page: 5 };
      const result = evaluateConstraints(params, {});
      expect(result.needsCorrection).toBe(false);
      expect(result.corrected).toEqual({ page: 5 });
    });

    it("should not mutate the original params object", () => {
      const params = { page: 10 };
      evaluateConstraints(params, {
        page: makeConstraint((v) => v <= 5, 5),
      });
      expect(params.page).toBe(10); // original untouched
    });

    it("should handle deeply nested corrections", () => {
      const params = { filters: { table: { page: 99 } } };
      const result = evaluateConstraints(params, {
        filters: {
          table: {
            page: makeConstraint((v) => v <= 10, 10),
          },
        },
      });
      expect(result.needsCorrection).toBe(true);
      expect(result.corrected).toEqual({ filters: { table: { page: 10 } } });
    });
  });

  describe("null guard for missing nested params", () => {
    it("should skip a nested constraint when the nested params key is undefined", () => {
      const params = { page: 1 } as Record<string, unknown>;
      // `table` key does not exist on params
      const result = evaluateConstraints(params, {
        table: {
          page: makeConstraint((v) => (v as number) <= 5, 5),
        } as never,
      });
      expect(result.needsCorrection).toBe(false);
      expect(result.corrected).toEqual({ page: 1 });
    });

    it("should skip a nested constraint when the nested params key is null", () => {
      const params = { table: null } as Record<string, unknown>;
      const result = evaluateConstraints(params, {
        table: {
          page: makeConstraint((v) => (v as number) <= 5, 5),
        } as never,
      });
      expect(result.needsCorrection).toBe(false);
    });
  });

  describe("parameter manipulation", () => {
    it("should handle params with extra keys not in constraints", () => {
      const params = { page: 3, search: "hello", sort: "asc" };
      const result = evaluateConstraints(params, {
        page: makeConstraint((v) => v <= 5, 5),
      });
      expect(result.corrected).toEqual({
        page: 3,
        search: "hello",
        sort: "asc",
      });
    });

    it("should handle string field constraints", () => {
      const params = { sort: "invalid" };
      const result = evaluateConstraints(params, {
        sort: makeConstraint((v) => ["asc", "desc"].includes(v), "asc"),
      });
      expect(result.needsCorrection).toBe(true);
      expect(result.corrected).toEqual({ sort: "asc" });
    });
  });
});

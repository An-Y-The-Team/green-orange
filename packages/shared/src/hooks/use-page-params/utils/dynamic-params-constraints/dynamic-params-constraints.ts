import type { Constraint } from "../../types";

/**
 * Clamps a numeric value to `[1, max]`. Not ready when `max` is `undefined`.
 *
 * When `max <= 0`, only values greater than `1` are corrected to `1`
 * (empty result sets / no pages).
 */
export const cap = (max: number | undefined): Constraint<number> => {
  if (max === undefined) {
    return {
      ready: false,
      check: () => true,
      correct: (value) => value,
    };
  }

  if (max <= 0) {
    return {
      ready: true,
      check: (value) => value <= 1,
      correct: (value) => (value > 1 ? 1 : value),
    };
  }

  return {
    ready: true,
    check: (value) => value >= 1 && value <= max,
    correct: (value) => Math.min(max, Math.max(1, value)),
  };
};

/**
 * Value must be in `allowed`. Not ready when `allowed` is `undefined`.
 * Empty `allowed` always corrects to `fallback`.
 */
export const oneOf = <T>(
  allowed: T[] | undefined,
  fallback: T
): Constraint<T> => {
  if (allowed === undefined) {
    return {
      ready: false,
      check: () => true,
      correct: (value) => value,
    };
  }

  return {
    ready: true,
    check: (value) =>
      allowed.length === 0 ? value === fallback : allowed.includes(value),
    correct: (value) =>
      allowed.length === 0 || !allowed.includes(value) ? fallback : value,
  };
};

/**
 * Every array element must appear in `allowed`. Not ready when `allowed` is `undefined`.
 * Corrects by filtering to allowed entries only (order preserved).
 */
export const arraySubsetOf = (
  allowed: readonly string[] | undefined
): Constraint<string[]> => {
  if (allowed === undefined) {
    return {
      ready: false,
      check: () => true,
      correct: (value) => value,
    };
  }

  const set = new Set(allowed);
  return {
    ready: true,
    check: (value) => (value ?? []).every((item) => set.has(item)),
    correct: (value) => (value ?? []).filter((item) => set.has(item)),
  };
};

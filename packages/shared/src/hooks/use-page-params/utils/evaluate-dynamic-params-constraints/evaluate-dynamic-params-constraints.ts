import type { Constraint, NestedConstraints } from "../../types";

const isConstraint = <V = unknown>(obj: unknown): obj is Constraint<V> => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "ready" in obj &&
    "check" in obj &&
    "correct" in obj
  );
};

/**
 * Recursively evaluates `constraints` against `params`.
 *
 * - Leaf constraints: if `ready && !check(value)`, apply `correct(value)`
 * - Nested objects: recurse, merge corrections into a shallow copy
 * - Returns the corrected params and whether any corrections were made
 *
 */
export const evaluateConstraints = <T extends Record<string, unknown>>(
  params: T,
  constraints: NestedConstraints<T>
): { corrected: T; needsCorrection: boolean } => {
  let needsCorrection = false;
  const corrected = { ...params };

  for (const key of Object.keys(constraints)) {
    const constraint = (constraints as Record<string, unknown>)[key];
    if (constraint === undefined) continue;

    if (isConstraint(constraint)) {
      if (!constraint.ready) continue;

      const value = params[key];
      if (constraint.check(value)) continue;

      (corrected as Record<string, unknown>)[key] = constraint.correct(value);
      needsCorrection = true;
    } else {
      // Nested constraints object — recurse
      const nestedParams = params[key];
      if (nestedParams === undefined || nestedParams === null) continue;

      const nested = evaluateConstraints(
        nestedParams as Record<string, unknown>,
        constraint as NestedConstraints<Record<string, unknown>>
      );

      if (nested.needsCorrection) {
        (corrected as Record<string, unknown>)[key] = nested.corrected;
        needsCorrection = true;
      }
    }
  }

  return { corrected, needsCorrection };
};

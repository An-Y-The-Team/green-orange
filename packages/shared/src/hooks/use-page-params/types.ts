export interface Constraint<V = unknown> {
  /** Is the async data loaded? Skip this constraint if false. */
  ready: boolean;
  /** Is the current value valid given the dynamic data? */
  check: (value: V) => boolean;
  /** Return the corrected value. */
  correct: (value: V) => V;
}

/**
 * Recursively maps the shape of `T` so that:
 * - Object values recurse deeper
 * - Leaf values become `Constraint<V>`
 * - All keys are optional (only constrained fields need entries)
 */
export type NestedConstraints<T> = {
  [K in keyof T as string extends K ? never : K]?: T[K] extends Record<
    string,
    unknown
  >
    ? NestedConstraints<T[K]>
    : Constraint<T[K]>;
};

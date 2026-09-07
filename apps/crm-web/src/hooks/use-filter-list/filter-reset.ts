/**
 * "Are any filters narrowing this list, and how do I clear them?"
 *
 * Every list page needs both answers for its empty state: all four used to say
 * "Không có {noun} nào khớp bộ lọc" whether or not a filter was set, so a
 * brand-new install blamed its first user's filters for an empty database.
 *
 * The comparison lives here rather than in each hook because array-valued
 * filters (`status`, `stage`, `type`, `role_id`) cannot be compared with `===`
 * and getting that wrong fails quietly: the empty state simply picks the wrong
 * sentence.
 */

/** Shallow value equality that also handles the array-valued filters. */
const sameValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    // Order-insensitive: a MultiSelect can hand back the same set in a
    // different order, which is not a filter change.
    if (a.length !== b.length) return false;
    const rest = [...b];
    return a.every((item) => {
      const at = rest.indexOf(item);
      if (at === -1) return false;
      rest.splice(at, 1);
      return true;
    });
  }
  return a === b;
};

export function filterReset<T extends object, K extends keyof T>({
  params,
  defaults,
  keys,
  apply,
}: {
  params: T;
  defaults: T;
  /** The FILTER keys only — page/limit/sort are not filters. */
  keys: readonly K[];
  apply: (updates: Partial<T>) => void;
}): { hasFilters: boolean; clearFilters: () => void } {
  return {
    hasFilters: keys.some((key) => !sameValue(params[key], defaults[key])),
    clearFilters: () => {
      const cleared: Partial<T> = {};
      for (const key of keys) cleared[key] = defaults[key];
      apply(cleared);
    },
  };
}

/**
 * Look up a Vietnamese label + badge variant for a value that came off the wire.
 *
 * The maps in `@/constants/labels` are `Record<SomeEnum, Label>`, but the keys we
 * feed them are raw API strings — TypeScript trusts them because the response
 * type says so, not because anything validated them. A stage or status the
 * backend adds (or one legacy row) used to make `map[key].label` throw and take
 * the whole page down. Here the unknown value degrades to a neutral badge
 * showing the raw key instead.
 *
 * The `console.warn` is the point: it's how we find out the enum drifted.
 */
export const labelOf = <
  K extends string,
  V extends { label: string; variant: string },
>(
  map: Record<K, V>,
  key: K
): V | { label: K; variant: "secondary" } => {
  const found = map?.[key];
  if (found) return found;
  // ponytail: warns on every render of the offending row. Loud on purpose —
  // dedupe it only if a drifted enum ever floods a log.
  console.warn(`[crm-web] unmapped label key: ${key}`);
  return { label: key, variant: "secondary" };
};

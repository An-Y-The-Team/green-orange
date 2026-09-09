/**
 * Keys for the `use()` promise cache (utils/query-cache). An enum, not loose
 * strings: a mutation has to invalidate exactly the key its write changed, and a
 * typo there shows up as stale data on screen rather than as an error.
 */
export enum QueryKey {
  PROJECTS = "projects",
  SHIFT = "shift",
  HISTORY = "history",
}

// Promise cache for React 19 `use()` — data loads suspend instead of living in
// useEffect chains (AGENTS.md: no useEffect reliance). A key is fetched once;
// mutations invalidate the keys they change and login clears everything.
const cache = new Map<string, Promise<unknown>>();

export function cachedFetch<T>(
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const promise = load().catch((error: unknown) => {
    // A failed load must not be cached, or retry would replay the rejection.
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
}

export function invalidate(key?: string): void {
  if (key === undefined) cache.clear();
  else cache.delete(key);
}

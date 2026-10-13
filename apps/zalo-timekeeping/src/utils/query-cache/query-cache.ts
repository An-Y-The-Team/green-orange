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

// Zalo keeps a mini app's webview alive when the worker switches back to the
// chat list, so the cache outlived the day: nothing ever invalidated the công
// trình list, and an assignment added in the office only appeared once the
// worker force-closed the app. Dropping everything on resume also refreshes the
// shift and the history, which are just as stale after a night with the app open.
let epoch = 0;
const listeners = new Set<() => void>();

const onVisibilityChange = () => {
  if (document.visibilityState !== "visible") return;
  cache.clear();
  epoch += 1;
  for (const listener of listeners) listener();
};

/** `useSyncExternalStore` pair — subscribing to it re-reads every key on resume. */
export function subscribeResume(onStoreChange: () => void): () => void {
  if (listeners.size === 0) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

export const resumeEpoch = (): number => epoch;

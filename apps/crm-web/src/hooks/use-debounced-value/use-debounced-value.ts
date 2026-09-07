"use client";

import { useEffect, useState } from "react";

/**
 * `value`, but only after it has stopped changing for `delayMs`.
 *
 * For a search box that drives a request: the caller renders the raw value so
 * typing stays instant, and passes this one to the query so a seven-character
 * client name is one request instead of seven.
 *
 * Clearing is immediate — an empty query means "show me the default list", and
 * making the user wait 300ms after an X-click reads as lag. That branch is a
 * render-time state adjustment rather than a `setState` inside the effect
 * (AGENTS.md, and the same shape `SearchInput` uses for its own reset).
 *
 * `SearchInput` keeps its inline debounce: that copy is tangled with the
 * local-echo and external-reset logic this hook has no use for.
 *
 * Deliberately without a unit test: vitest runs here with no DOM, so a "test"
 * could only re-implement the timer and would pass while the hook was broken.
 * What it is checked against instead is the real thing — the request count
 * while typing into the combobox (plan 05).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  const isEmpty = value === "" || value == null;

  if (isEmpty && debounced !== value) setDebounced(value);

  useEffect(() => {
    if (isEmpty) return;
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, isEmpty]);

  return debounced;
}

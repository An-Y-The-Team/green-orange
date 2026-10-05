"use client";

import { useSearchParams } from "next/navigation";
import { z } from "zod";

/**
 * The active tab, in the URL.
 *
 * Both tab bars held it in `useState`, so a reload, the back button, or a link
 * sent to a colleague all landed on tab 1 — and the house rule in
 * `.claude/frontend-code-style.md` is that anything visible on the page should
 * be reproducible by pasting the URL.
 *
 * The tab is read straight from `useSearchParams` rather than `usePageParams`:
 * that hook copies the URL into state once on mount, so a sidebar link from
 * `/crew` to `/crew?tab=timekeeping` — same route, no remount — changed the URL
 * and left the tab where it was. Next syncs `useSearchParams` with
 * `history.replaceState`, so the URL alone is enough.
 *
 * An unknown or absent `?tab=` falls back to the default tab, exactly like the
 * list params schemas' `.catch()`, so a stale bookmark renders rather than
 * breaking. Switching tabs drops the other params (a tab's filters belong to
 * that tab) and omits `?tab=` for the default, like `cleanUrlParams`.
 */
export function useTabParam<const T extends readonly [string, ...string[]]>(
  tabs: T,
  defaultTab: T[number]
) {
  const parsed = z.enum(tabs).safeParse(useSearchParams().get("tab"));
  const tab: T[number] = parsed.success ? parsed.data : defaultTab;

  const setTab = (next: T[number]) =>
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (next === defaultTab ? "" : `?tab=${next}`)
    );

  return [tab, setTab] as const;
}

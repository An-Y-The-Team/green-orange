"use client";

import { z } from "zod";

import { usePageParams } from "@yan/shared/hooks";

/**
 * The active tab, in the URL.
 *
 * Both tab bars held it in `useState`, so a reload, the back button, or a link
 * sent to a colleague all landed on tab 1 — and the house rule in
 * `.claude/frontend-code-style.md` is that anything visible on the page should
 * be reproducible by pasting the URL.
 *
 * An unknown or absent `?tab=` falls back to the first tab via `.catch()`,
 * exactly like the list params schemas, so a stale bookmark renders rather
 * than breaking.
 */
export function useTabParam<const T extends readonly [string, ...string[]]>(
  tabs: T,
  defaultTab: T[number]
) {
  // The cast is the price of the const generic: `z.enum(tabs)` infers
  // `Writeable<T>` and `.catch()` widens the output to include `undefined`,
  // neither of which unifies with `ZodType<{ tab: T[number] }>`. The runtime
  // shape is exactly that, and `.catch()` guarantees a member of `tabs`.
  const schema = z.object({
    tab: z.enum(tabs).catch(defaultTab),
  }) as unknown as z.ZodType<{ tab: T[number] }, z.ZodTypeDef, unknown>;

  const { params, setParams } = usePageParams<{ tab: T[number] }>({
    defaultParams: { tab: defaultTab },
    schema,
  });

  return [params.tab, (tab: T[number]) => setParams({ tab })] as const;
}

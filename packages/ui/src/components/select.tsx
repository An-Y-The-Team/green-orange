import * as React from "react";

import { cn } from "../lib/utils";

/**
 * The one select style, for a **native** `<select>`.
 *
 * There were six copies of this string — `Input`'s own, crm-web's
 * `SELECT_CLASS` (28 call sites), the company editor's, the workspace header's
 * (`h-9 rounded-md shadow-sm` and **no focus rule**), `TablePagination`'s, and
 * `MultiSelect`'s trigger, whose comment already admitted it was a copy. Three
 * heights, two radii, one control with no focus ring at all.
 *
 * Exported separately from the component because `MultiSelect`'s trigger is a
 * Base UI button, not a `<select>`, and still has to line up with it.
 */
export const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/**
 * A styled native `<select>`.
 *
 * Native on purpose, and this is the deliberate ceiling: every one of the six
 * copies it replaces was a native select wired straight to `form.register()`
 * or an `onChange`, so this collapses them with no behaviour change — and it
 * keeps the platform's own keyboard handling, type-ahead and mobile wheel
 * picker for free.
 *
 * ponytail: the native popup ignores the app's theme (an OS-drawn list on a
 * dark page). `MultiSelect` next door already shows the Base UI `Select`
 * pattern that fixes that; move a call site to it when a styled popup is worth
 * rewriting the `<option>` children for.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(selectClass, className)}
      {...props}
    />
  );
}

export { Select };

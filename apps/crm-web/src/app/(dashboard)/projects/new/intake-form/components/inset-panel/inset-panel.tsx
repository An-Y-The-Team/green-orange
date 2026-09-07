import type { ReactNode } from "react";

/**
 * The inset panel an inline "quick create" block sits in.
 *
 * Deliberately *not* a `Card`: it opens inside the intake form's own Card, and
 * the tint is what says "this is a sub-form, not a section". The three
 * quick-create blocks (client, contact, location) each carried this className.
 */
export function InsetPanel({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {children}
    </div>
  );
}

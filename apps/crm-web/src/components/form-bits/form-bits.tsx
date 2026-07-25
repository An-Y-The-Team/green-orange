import type { FieldError } from "react-hook-form";

// Shared bits for the demo create-dialogs so each form stays terse. The native
// <select> styling mirrors the Input component from @yan/ui (no Select primitive
// exists in the shared package).
export const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function fieldError(error?: FieldError) {
  if (!error?.message) return null;
  return <p className="text-xs text-destructive">{error.message}</p>;
}

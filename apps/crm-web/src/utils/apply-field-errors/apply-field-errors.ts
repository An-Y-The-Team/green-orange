import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

/**
 * Server field errors → the fields themselves.
 *
 * `update-project.ts` and friends return zod's `flatten().fieldErrors`, and
 * `use-server-actions` flattened the lot into a toast description. So a server
 * rejection highlighted nothing: no field, no summary, no scroll-to-first-error
 * — the user was told "check your input" and left to guess which.
 *
 * `shouldFocus` handles the scroll for us: RHF focuses the first field it can,
 * which on a 26-control builder is the difference between a fixable error and a
 * hunt.
 *
 * A key the form doesn't own (a nested payload field, or `_form`) is skipped
 * rather than silently swallowed — the toast still carries it.
 */
export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  errors: Record<string, string[]>
): void {
  const known = new Set(Object.keys(form.getValues()));
  let focused = false;

  for (const [field, messages] of Object.entries(errors)) {
    const message = messages?.[0];
    if (!message || !known.has(field)) continue;
    form.setError(
      field as Path<T>,
      { type: "server", message },
      { shouldFocus: !focused }
    );
    focused = true;
  }
}

import { pluralize } from "../string/string";

const MAX_DISPLAYED_ERRORS = 3;

/**
 * Builds a user-facing error message from a server action's error response.
 *
 * Flattens all field errors into a single comma-separated string, with `_form`
 * errors prioritized first. Duplicate messages are removed, and output is capped
 * at {@link MAX_DISPLAYED_ERRORS} entries (remaining are summarized as "and N more error(s)").
 *
 * @param errors - The `errors` record from a server action response (e.g. Zod's `flatten().fieldErrors`).
 * @param fallbackMessage - Used when `errors` is empty/undefined. Defaults to "An unexpected error occurred."
 * @returns A formatted error string suitable for toast notifications.
 *
 * @example
 * buildServerActionErrorMessage({
 *   errors: { _form: ["Unauthorized"], name: ["Name is required"] },
 *   fallbackMessage: "Validation failed",
 * });
 * // => "Unauthorized, Name is required"
 */
export function buildServerActionErrorMessage({
  errors,
  fallbackMessage = "An unexpected error occurred.",
}: {
  errors: Record<string, string[]> | undefined;
  fallbackMessage?: string;
}): string {
  if (errors) {
    // Collect _form errors first, then remaining fields
    const formErrors = Array.isArray(errors._form)
      ? errors._form.filter((m) => m.length > 0)
      : [];
    const fieldErrors = Object.entries(errors)
      .filter(([key]) => key !== "_form")
      .flatMap(([, messages]) =>
        Array.isArray(messages) ? messages.filter((m) => m.length > 0) : []
      );

    const allErrors = [...new Set([...formErrors, ...fieldErrors])];

    if (allErrors.length > MAX_DISPLAYED_ERRORS) {
      const remaining = allErrors.length - MAX_DISPLAYED_ERRORS;
      const shown = allErrors.slice(0, MAX_DISPLAYED_ERRORS).join(" ");
      return `${shown}, and ${remaining} more ${pluralize(remaining, "error")}`;
    }
    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }
  return fallbackMessage || "An unexpected error occurred.";
}

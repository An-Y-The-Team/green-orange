import type { FieldError } from "react-hook-form";

import { Label } from "@yan/ui/components/label";

// Shared bits for the forms that are not (yet) built on the @yan/ui `Form*`
// primitives, so each stays terse. The native <select> styling mirrors the Input
// component from @yan/ui (no Select primitive exists in the shared package —
// plan 10 promotes one).
export const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * A field's label, associated with its control and marked when required.
 *
 * Two gaps in one: nothing in the app marked a required field (the only marking
 * was the inverse, "(không bắt buộc)", in three places — so users discovered
 * what was required by submitting), and these labels were **siblings** of their
 * inputs with no `htmlFor`, so they associated with nothing at all. Passing the
 * control's `id` here fixes both for the field it is used on.
 *
 * The asterisk is `aria-hidden` because the control carries `aria-required`,
 * which is what a screen reader should hear.
 *
 * `FormLabel` from `@yan/ui/components/form` does all of this automatically —
 * use that in a form built on `FormField`/`FormItem`. This is for the four
 * forms that are not.
 */
export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required ? (
        <span aria-hidden className="text-destructive">
          *
        </span>
      ) : null}
    </Label>
  );
}

/**
 * The `id` / `aria-invalid` / `aria-describedby` trio a control needs so its
 * label and its error message are actually attached to it.
 *
 * Errors used to render as a bare `<p className="text-xs text-destructive">`:
 * visible, and announced to nobody. A screen-reader user tabbing into an
 * invalid field heard the label and nothing else — no "invalid", no reason —
 * while the sighted user two inches away read "Nhập tên khách hàng".
 *
 * Mirrors what `FormControl` does automatically in a form built on
 * `FormField`/`FormItem` (`@yan/ui/components/form`); this is the manual half
 * for the forms that are not.
 */
export function fieldProps(id: string, error?: FieldError) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

/** The message half of {@link fieldProps} — same `id`, so the two connect. */
export function fieldError(error?: FieldError, id?: string) {
  if (!error?.message) return null;
  return (
    <p id={id ? `${id}-error` : undefined} className="text-xs text-destructive">
      {error.message}
    </p>
  );
}

"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

/**
 * "Why won't this submit?" — answered at the top of the form instead of only
 * beside whichever field the operator has to scroll to find.
 *
 * Long forms are the whole reason this exists: intake is eleven fields, the
 * báo giá and quyết toán builders are four controls per line item plus the
 * totals block, so a single message next to a row twelve inches down the page
 * is invisible. Each entry focuses its own field, which is also how a
 * `field_array` error ("Nhập nội dung" on row 3) becomes reachable at all.
 *
 * Only after a submit attempt: a summary that appears while the form is still
 * being filled in is the mid-keystroke nagging `mode: "onTouched"` removes.
 */
export function FormErrorSummary<T extends FieldValues>({
  form,
}: {
  form: UseFormReturn<T>;
}) {
  const { errors, submitCount } = form.formState;
  const entries = submitCount > 0 ? flattenFieldErrors(errors) : [];
  if (entries.length === 0) return null;

  return (
    // Not aria-live: RHF renders this in the same commit as the failed submit,
    // so a live region would announce before the list exists. role="alert" on
    // freshly mounted content is what actually gets read out.
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
    >
      <p className="font-medium text-destructive">
        Chưa gửi được — {entries.length} chỗ cần sửa:
      </p>
      <ul className="mt-1 space-y-0.5">
        {entries.map(([name, message]) => (
          <li key={name}>
            <button
              type="button"
              className="text-left underline underline-offset-2 hover:no-underline"
              onClick={() => form.setFocus(name as Path<T>)}
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * RHF nests errors the same way the values are nested (`items.3.description`),
 * so the summary has to walk it — a flat `Object.entries` shows nothing for the
 * line-item grids, which is exactly where a summary earns its keep.
 */
export function flattenFieldErrors(
  node: unknown,
  path = ""
): [string, string][] {
  if (!node || typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  if (typeof record.message === "string") return [[path, record.message]];
  return Object.entries(record).flatMap(([key, value]) =>
    // `ref` is a live DOM node on every error leaf; recursing into one walks
    // the document instead of the form.
    key === "ref"
      ? []
      : flattenFieldErrors(value, path ? `${path}.${key}` : key)
  );
}

"use client";

import { useEffect } from "react";

/**
 * Warn before losing typed-but-unsaved work.
 *
 * The quote builder is ~26 controls on one page (four per line item, plus VAT,
 * note and the rep fields); the settlement builder is the same shape. There was
 * no guard of any kind — `beforeunload`, `isDirty`, navigation block — so
 * **Cancel** and any nav click discarded the lot silently.
 *
 * This covers the browser-level exits (reload, tab close, back). In-app
 * navigation is guarded at the call site, where a `ConfirmAction` can say what
 * is about to be lost instead of the browser's untranslatable dialog — Next's
 * App Router still has no supported way to intercept a client-side route
 * change, so intercepting the button that starts one is the honest option.
 *
 * Autosave is deliberately NOT the answer here: a half-typed báo giá is not a
 * draft anyone wants persisted. `components/editor/use-autosave.tsx` stays for
 * the document editors, where a draft IS the point.
 */
export function useUnsavedGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      // Both lines: `preventDefault` is the spec, `returnValue` is what older
      // Safari and Firefox actually honour.
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}

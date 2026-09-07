"use client";

import { Button } from "@yan/ui/components/button";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { ACTIONS } from "@/constants/labels";

/**
 * The Cancel button on a form, which asks first once anything has been typed.
 *
 * Every form's Cancel used to `router.push` straight out, so an eleven-field
 * intake or a five-row quyết toán was one misclick from gone with no warning
 * and no draft. `useUnsavedGuard` covers the browser-level exits; this covers
 * the in-app one, and it is the same dialog rather than the browser's
 * untranslatable "Leave site?".
 *
 * Clean form = no dialog. A confirm on a form nobody has touched is friction
 * that teaches the operator to click through confirms.
 */
export function CancelButton({
  dirty,
  onCancel,
}: {
  dirty: boolean;
  onCancel: () => void;
}) {
  const button = (
    <Button type="button" variant="outline">
      {ACTIONS.cancel}
    </Button>
  );

  return dirty ? (
    <ConfirmAction
      trigger={button}
      title="Bỏ các thay đổi?"
      consequence="Những gì bạn đã nhập sẽ không được lưu."
      confirmLabel="Bỏ thay đổi"
      onConfirm={onCancel}
    />
  ) : (
    <Button type="button" variant="outline" onClick={onCancel}>
      {ACTIONS.cancel}
    </Button>
  );
}

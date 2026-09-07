"use client";

import { type ReactElement, type ReactNode, useState } from "react";

import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@yan/ui/components/dialog";

import { ACTIONS } from "@/constants/labels";

/**
 * Confirm gate for a write the UI cannot undo — money marked collected, a
 * timestamp stamped, a stage jumped, a terminal status set.
 *
 * `consequence` is the reason this dialog exists: it must say what the click
 * actually does (which record moves, what date gets written, what stops being
 * editable). A dialog that only re-asks the button's own label is pure friction
 * — don't add one.
 *
 * Fires and closes, like the stepper's back-confirm always did: the action's
 * own toast reports success or failure, so nothing here waits on the promise.
 * `children` renders extra fields above the footer (a paid-date picker, say).
 */
export function ConfirmAction({
  trigger,
  title,
  consequence,
  confirmLabel = ACTIONS.confirm,
  onConfirm,
  pending,
  confirmDisabled,
  children,
}: {
  /** The button that opens the dialog — Base UI merges the trigger props in. */
  trigger: ReactElement;
  title: string;
  consequence?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {consequence ? (
            <DialogDescription>{consequence}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {ACTIONS.close}
          </Button>
          <Button
            disabled={pending || confirmDisabled}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

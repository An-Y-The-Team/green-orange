"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";

import { updateProject } from "@/app/(dashboard)/projects/actions/update-project";
import { ACTIONS, FIELDS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { todayISO } from "@/utils/today-iso/today-iso";

import type { Project } from "../../../../types";
import { gateButtonProps } from "../../../utils/gate-button-props/gate-button-props";

/**
 * Gate action for `GateKey.CLIENT_SIGNED`: stamps `client_signed_date` (the
 * client confirmed — a signed contract or the chốt quote alone). A tiny date
 * confirm, the only input it needs.
 */
export function RecordClientSigned({
  project,
  primary,
}: {
  project: Project;
  primary: boolean;
}) {
  const [state, action] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [signedDate, setSignedDate] = useState(todayISO);
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setOpen(false),
  });

  // Confirm — saves the chosen sign date on the project.
  const handleConfirm = () =>
    startTransition(() => action({ client_signed_date: signedDate }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button {...gateButtonProps(primary)} onClick={() => setOpen(true)}>
        Ghi nhận đã ký
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận khách đã ký</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="client-signed-date">{FIELDS.signDate}</Label>
          <DateInput
            id="client-signed-date"
            value={signedDate}
            onChange={setSignedDate}
          />
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline">{ACTIONS.close}</Button>}
          />
          <Button disabled={isPending || !signedDate} onClick={handleConfirm}>
            {ACTIONS.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

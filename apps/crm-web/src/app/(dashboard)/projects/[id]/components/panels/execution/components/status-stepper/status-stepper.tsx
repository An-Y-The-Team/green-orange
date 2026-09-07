"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { ACTIONS, EXECUTION_SUB_STATUSES } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { labelOf } from "@/utils/label-of/label-of";

import { updateProjectWithNote } from "../../../../../../actions/update-project-with-note";
import { ExecutionSubStatus } from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { EXECUTION_STEPS } from "../../constants";

/** Sub-status advance: one tap, optional note. Backend rejects backward moves. */
export function StatusStepper({ project }: { project: Project }) {
  const current = project.execution_sub_status ?? ExecutionSubStatus.KICKOFF;
  const currentIndex = EXECUTION_STEPS.indexOf(current);

  // The status and its optional note go through one action: the note used to
  // fire from this action's onSuccess with `silent: true`, so a failed note
  // meant the status moved and the note vanished with no toast at all.
  const [state, formAction] = useActionState(
    updateProjectWithNote.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();

  const [pending, setPending] = useState<ExecutionSubStatus | null>(null);
  const [note, setNote] = useState("");

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => {
      setPending(null);
      setNote("");
    },
  });

  // At kickoff both "→ Dựng rào" and "→ Thi công" are offered (skip allowed).
  const nextTargets = EXECUTION_STEPS.filter((_, i) => i > currentIndex);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {EXECUTION_STEPS.map((step, i) => {
          const reached = i <= currentIndex;
          const badge = labelOf(EXECUTION_SUB_STATUSES, step);
          return (
            <span key={step} className="flex items-center gap-2">
              {i > 0 ? <span className="text-muted-foreground">──</span> : null}
              <Badge
                variant={reached ? badge.variant : "secondary"}
                className={reached ? "" : "opacity-50"}
              >
                {badge.label}
              </Badge>
            </span>
          );
        })}
      </div>

      {nextTargets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextTargets.map((target) => (
            <Button
              key={target}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setPending(target)}
            >
              → {labelOf(EXECUTION_SUB_STATUSES, target).label}
            </Button>
          ))}
        </div>
      ) : null}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Chuyển sang:{" "}
              {pending ? labelOf(EXECUTION_SUB_STATUSES, pending).label : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="step-note">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="step-note"
              rows={2}
              value={note}
              placeholder="Ghi chú cho bước này…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="ghost">{ACTIONS.close}</Button>}
            />
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(() =>
                  formAction({
                    patch: { execution_sub_status: pending! },
                    // Carries the sub-status as its tag (timeline in Ghi chú).
                    note: note.trim()
                      ? { body: note.trim(), tag: pending! }
                      : undefined,
                  })
                )
              }
            >
              {ACTIONS.continue}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

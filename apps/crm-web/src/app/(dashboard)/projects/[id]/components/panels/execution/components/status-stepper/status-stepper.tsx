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

import { executionSubStatus } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { addNote } from "../../../../../../actions/add-note";
import { updateProject } from "../../../../../../actions/update-project";
import { ExecutionSubStatus } from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { EXECUTION_STEPS } from "../../constants";

/** Sub-status advance: one tap, optional note. Backend rejects backward moves. */
export function StatusStepper({ project }: { project: Project }) {
  const current = project.execution_sub_status ?? ExecutionSubStatus.KICKOFF;
  const currentIndex = EXECUTION_STEPS.indexOf(current);

  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [noteState, noteAction] = useActionState(
    addNote.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [, startNote] = useTransition();

  const [pending, setPending] = useState<ExecutionSubStatus | null>(null);
  const [note, setNote] = useState("");

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => {
      // Optional note carries the sub-status as its tag (timeline in Ghi chú).
      if (pending && note.trim()) {
        const tag = pending;
        startNote(() => noteAction({ body: note.trim(), tag }));
      }
      setPending(null);
      setNote("");
    },
  });
  useServerAction(noteState, false, { ...ACTION_TOAST_TITLES, silent: true });

  // At kickoff both "→ Dựng rào" and "→ Thi công" are offered (skip allowed).
  const nextTargets = EXECUTION_STEPS.filter((_, i) => i > currentIndex);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {EXECUTION_STEPS.map((step, i) => {
          const reached = i <= currentIndex;
          return (
            <span key={step} className="flex items-center gap-2">
              {i > 0 ? <span className="text-muted-foreground">──</span> : null}
              <Badge
                variant={
                  reached ? executionSubStatus[step].variant : "secondary"
                }
                className={reached ? "" : "opacity-50"}
              >
                {executionSubStatus[step].label}
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
              → {executionSubStatus[target].label}
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
              Chuyển sang: {pending ? executionSubStatus[pending].label : ""}
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
            <DialogClose render={<Button variant="ghost">Đóng</Button>} />
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(() =>
                  formAction({ execution_sub_status: pending! })
                )
              }
            >
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";
import { Select } from "@yan/ui/components/select";

import {
  ACTIONS,
  PROJECT_STAGES,
  PROJECT_STAGE_ORDER,
} from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { labelOf } from "@/utils/label-of/label-of";

import { updateProject } from "../../../../../actions/update-project";
import { ProjectStage } from "../../../../../enums";
import type { Project } from "../../../../../types";
import type { StageGate } from "../../../../utils/stage-gates/stage-gates";

/**
 * The manual stage move — an exception, not the flow. Stages advance by
 * themselves when the work is done (crm-api-nest common/stage.ts); this is for
 * backfilling a pre-CRM job, undoing a mistake, or reopening a closed one.
 * Soft: the open rows of the current stage are listed, never blocking.
 */
export function MoveStageDialog({
  project,
  gates,
}: {
  project: Project;
  /** The CURRENT stage's gates — their open rows are the warning. */
  gates: StageGate[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // A closed project only reopens to Quyết toán (the server refuses any other
  // PATCH on a closed project).
  const targets =
    project.stage === ProjectStage.CLOSED
      ? [ProjectStage.SETTLEMENT]
      : PROJECT_STAGE_ORDER.filter((s) => s !== project.stage);
  const nextStage =
    PROJECT_STAGE_ORDER[PROJECT_STAGE_ORDER.indexOf(project.stage) + 1];
  const defaultTarget =
    nextStage && targets.includes(nextStage) ? nextStage : targets[0];
  const [target, setTarget] = useState<ProjectStage>(defaultTarget);

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setOpen(false),
  });

  const unmet = gates.filter((g) => !g.done);
  const currentLabel = labelOf(PROJECT_STAGES, project.stage).label;

  // Open — always start from the sensible default, not last time's pick.
  const handleOpen = () => {
    setTarget(defaultTarget);
    setOpen(true);
  };

  // Confirm — PATCH the stage; the toast reports the outcome.
  const handleConfirm = () =>
    startTransition(() => formAction({ stage: target }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" onClick={handleOpen}>
        Chuyển giai đoạn…
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển giai đoạn thủ công</DialogTitle>
          <DialogDescription>
            Thường không cần: làm xong việc thì công trình tự chuyển. Chỉ dùng
            khi nhập công trình cũ hoặc sửa nhầm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="move-stage-target">Chuyển sang</Label>
          <Select
            id="move-stage-target"
            value={target}
            onChange={(e) => setTarget(e.target.value as ProjectStage)}
          >
            {targets.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STAGE_ORDER.indexOf(s) + 1}.{" "}
                {labelOf(PROJECT_STAGES, s).label}
              </option>
            ))}
          </Select>
        </div>
        {unmet.length > 0 ? (
          <div className="rounded-lg border border-waiting/40 bg-waiting-soft px-3 py-2 text-sm">
            <p className="font-medium text-waiting">
              Còn {unmet.length} việc ở {currentLabel} — các việc này vẫn hiện
              để làm sau.
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {unmet.map((g) => (
                <li key={g.key}>
                  {g.label}
                  {g.detail ? ` (${g.detail})` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline">{ACTIONS.close}</Button>}
          />
          <Button disabled={isPending} onClick={handleConfirm}>
            Chuyển giai đoạn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

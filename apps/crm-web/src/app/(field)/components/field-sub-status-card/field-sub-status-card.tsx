"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { updateProjectWithNote } from "@/app/(dashboard)/projects/actions/update-project-with-note";
import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
  ExecutionSubStatus,
  ProjectStage,
} from "@/app/(dashboard)/projects/enums";
import type { Project } from "@/app/(dashboard)/projects/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import {
  ACCEPTANCE_SUB_STATUSES,
  EXECUTION_SUB_STATUSES,
} from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { labelOf } from "@/utils/label-of/label-of";

import { FieldRow } from "../field-row/field-row";

// Forward-only order; hoarding skippable (mirrors the execution panel).
const EXEC_STEPS = [
  ExecutionSubStatus.KICKOFF,
  ExecutionSubStatus.HOARDING,
  ExecutionSubStatus.WORKS,
] as const;

export function FieldSubStatusCard({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProjectWithNote.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [scheduledDate, setScheduledDate] = useState("");
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, ACTION_TOAST_TITLES);
  const run = (input: Parameters<typeof updateProjectWithNote>[2]) =>
    startTransition(() => formAction(input));

  // Client named an inspection date: stamp it and move to inspecting.
  const handleScheduled = () =>
    run({
      patch: {
        acceptance_sub_status: AcceptanceSubStatus.INSPECTING,
        acceptance_scheduled_date: scheduledDate,
      },
      note: {
        body: `Khách hẹn nghiệm thu ${formatDate(scheduledDate)}`,
        tag: AcceptanceNoteTag.SCHEDULED,
      },
    });

  // Client agreed with the result; the office finishes once the signed minutes arrive.
  const handleAgreed = () =>
    run({
      patch: { acceptance_sub_status: AcceptanceSubStatus.SIGNING },
      note: {
        body: "Nghiệm thu Đạt",
        tag: AcceptanceNoteTag.AGREED,
      },
    });

  // Rework finished: back to inspecting.
  const handleReworkDone = () =>
    run({
      patch: { acceptance_sub_status: AcceptanceSubStatus.INSPECTING },
      note: {
        body: "Đã sửa xong, nghiệm thu lại",
        tag: AcceptanceNoteTag.REWORK_DONE,
      },
    });

  const isExecution = project.stage === ProjectStage.EXECUTION;

  const execCurrent =
    project.execution_sub_status ?? ExecutionSubStatus.KICKOFF;
  const execTargets = EXEC_STEPS.filter(
    (_, i) => i > EXEC_STEPS.indexOf(execCurrent)
  );

  const acc = project.acceptance_sub_status ?? AcceptanceSubStatus.REQUEST_SENT;

  const currentLabel = isExecution
    ? labelOf(EXECUTION_SUB_STATUSES, execCurrent)
    : labelOf(ACCEPTANCE_SUB_STATUSES, acc);

  return (
    <FieldRow>
      <Link
        href={`/projects/${project.id}`}
        className="flex items-center justify-between gap-2"
      >
        <span className="font-medium">{project.code}</span>
        <Badge variant={currentLabel.variant}>{currentLabel.label}</Badge>
      </Link>

      <div className="flex flex-wrap gap-2">
        {isExecution ? (
          <>
            {execTargets.map((target) => (
              <Button
                key={target}
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run({ patch: { execution_sub_status: target } })}
              >
                → {labelOf(EXECUTION_SUB_STATUSES, target).label}
              </Button>
            ))}
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                run({
                  patch: {
                    works_done_at: new Date().toISOString(),
                    stage: ProjectStage.ACCEPTANCE,
                    acceptance_sub_status: AcceptanceSubStatus.REQUEST_SENT,
                  },
                })
              }
            >
              Xác nhận hoàn tất
            </Button>
          </>
        ) : (
          <>
            {acc === AcceptanceSubStatus.REQUEST_SENT ? (
              <ConfirmAction
                trigger={
                  <Button variant="outline" size="sm" disabled={isPending}>
                    Khách đã hẹn lịch
                  </Button>
                }
                title="Khách đã hẹn lịch nghiệm thu"
                consequence="Ghi nhận ngày khách hẹn và chuyển sang Thực hiện Nghiệm thu."
                pending={isPending}
                confirmDisabled={!scheduledDate}
                onConfirm={handleScheduled}
              >
                <div className="space-y-1">
                  <Label htmlFor={`scheduled-${project.id}`}>
                    Ngày khách hẹn nghiệm thu
                  </Label>
                  <DateInput
                    id={`scheduled-${project.id}`}
                    value={scheduledDate}
                    onChange={setScheduledDate}
                  />
                </div>
              </ConfirmAction>
            ) : null}
            {acc === AcceptanceSubStatus.INSPECTING ? (
              <ConfirmAction
                trigger={
                  <Button size="sm" disabled={isPending}>
                    Nghiệm thu Đạt
                  </Button>
                }
                title="Nghiệm thu Đạt"
                consequence="Ghi nhận khách đồng ý kết quả. Văn phòng sẽ hoàn tất khi có biên bản đã ký."
                pending={isPending}
                onConfirm={handleAgreed}
              />
            ) : null}
            {acc === AcceptanceSubStatus.REWORK ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleReworkDone}
              >
                Bổ sung xong, nghiệm thu lại
              </Button>
            ) : null}
            {acc === AcceptanceSubStatus.SIGNING ? (
              <p className="text-muted-foreground text-sm">
                Chờ ký biên bản, văn phòng hoàn tất.
              </p>
            ) : null}
          </>
        )}
      </div>
    </FieldRow>
  );
}

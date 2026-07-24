"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";

import { updateProject } from "@/app/(dashboard)/projects/actions/update-project";
import {
  AcceptanceSubStatus,
  ExecutionSubStatus,
  ProjectStage,
} from "@/app/(dashboard)/projects/enums";
import type { Project } from "@/app/(dashboard)/projects/types";
import { acceptanceSubStatus, executionSubStatus } from "@/lib/labels";

const initialState: ServerActionState = { success: false };
const toastOpts = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

// Forward-only order; hoarding skippable (mirrors the execution panel).
const EXEC_STEPS = [
  ExecutionSubStatus.KICKOFF,
  ExecutionSubStatus.HOARDING,
  ExecutionSubStatus.WORKS,
] as const;

export function FieldSubStatusCard({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    initialState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, toastOpts);
  const run = (input: Parameters<typeof updateProject>[2]) =>
    startTransition(() => formAction(input));

  const isExecution = project.stage === ProjectStage.EXECUTION;

  const execCurrent =
    project.execution_sub_status ?? ExecutionSubStatus.KICKOFF;
  const execTargets = EXEC_STEPS.filter(
    (_, i) => i > EXEC_STEPS.indexOf(execCurrent)
  );

  const acc = project.acceptance_sub_status ?? AcceptanceSubStatus.REQUEST_SENT;

  const currentLabel = isExecution
    ? executionSubStatus[execCurrent]
    : acceptanceSubStatus[acc];

  return (
    <div className="space-y-3 rounded-lg border p-3">
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
                onClick={() => run({ execution_sub_status: target })}
              >
                → {executionSubStatus[target].label}
              </Button>
            ))}
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                run({
                  works_done_at: new Date().toISOString(),
                  stage: ProjectStage.ACCEPTANCE,
                  acceptance_sub_status: AcceptanceSubStatus.REQUEST_SENT,
                })
              }
            >
              Xác nhận hoàn tất
            </Button>
          </>
        ) : (
          <>
            {acc === AcceptanceSubStatus.REQUEST_SENT ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run({ acceptance_sub_status: AcceptanceSubStatus.INSPECTING })
                }
              >
                Khách đã hẹn lịch
              </Button>
            ) : null}
            {acc === AcceptanceSubStatus.INSPECTING ? (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run({ acceptance_sub_status: AcceptanceSubStatus.PASSED })
                }
              >
                ✓ Đạt
              </Button>
            ) : null}
            {acc === AcceptanceSubStatus.REWORK ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run({ acceptance_sub_status: AcceptanceSubStatus.INSPECTING })
                }
              >
                Bổ sung xong — nghiệm thu lại
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

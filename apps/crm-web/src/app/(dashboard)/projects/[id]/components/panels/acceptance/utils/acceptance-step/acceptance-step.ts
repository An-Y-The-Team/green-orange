import { StepState } from "@/components/step-list/enums";
import { formatDate } from "@/utils/format-date/format-date";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { AcceptanceStepKey } from "../../enums";

export interface AcceptanceStepInfo {
  key: AcceptanceStepKey;
  state: StepState;
  /** One line shown once the step is not the open one. */
  summary?: string;
  /** Text of the amber badge beside the title. */
  badge?: string;
}

/**
 * Maps the sub-status (null = request_sent) onto the three steps of the panel:
 * Hẹn ngày, Thực hiện Nghiệm thu (rework is a branch of it), Biên bản & hoàn tất.
 */
export function acceptanceSteps({ project }: { project: Project }): {
  reworkCount: number;
  steps: AcceptanceStepInfo[];
} {
  const sub = project.acceptance_sub_status ?? AcceptanceSubStatus.REQUEST_SENT;
  const reworkCount = (project.notes ?? []).filter(
    (n) => n.tag === AcceptanceNoteTag.REWORK
  ).length;

  const scheduled = sub !== AcceptanceSubStatus.REQUEST_SENT;
  const agreed =
    sub === AcceptanceSubStatus.SIGNING || sub === AcceptanceSubStatus.PASSED;
  const passed = sub === AcceptanceSubStatus.PASSED;

  const scheduleDate = formatDate(project.acceptance_scheduled_date);
  const passedDate = formatDate(project.acceptance_passed_date);

  const stateOf = (done: boolean, isNow: boolean) =>
    done ? StepState.DONE : isNow ? StepState.NOW : StepState.FUTURE;

  return {
    reworkCount,
    steps: [
      {
        key: AcceptanceStepKey.SCHEDULE,
        state: stateOf(scheduled, !scheduled),
        summary: scheduled
          ? scheduleDate
            ? `Ngày hẹn: ${scheduleDate}`
            : "Đã hẹn lịch"
          : undefined,
      },
      {
        key: AcceptanceStepKey.INSPECT,
        state: stateOf(agreed, scheduled && !agreed),
        summary: agreed
          ? reworkCount > 0
            ? `Nghiệm thu Đạt · sửa lỗi ${reworkCount} lần`
            : "Nghiệm thu Đạt · không phải sửa"
          : undefined,
        badge:
          sub === AcceptanceSubStatus.REWORK
            ? `Đang sửa lỗi · lần ${reworkCount}`
            : undefined,
      },
      {
        key: AcceptanceStepKey.SIGN,
        state: stateOf(passed, agreed && !passed),
        summary: passed
          ? passedDate
            ? `Hoàn tất ${passedDate}`
            : "Hoàn tất"
          : undefined,
      },
    ],
  };
}

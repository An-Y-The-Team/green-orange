"use client";

import { CircleCheckBig } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { PROJECT_STAGE_ORDER } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { localISO, nowHHmm, todayISO } from "@/utils/today-iso/today-iso";

import { updateProject } from "../../../../../../actions/update-project";
import {
  AcceptanceSubStatus,
  AttachmentKind,
  ProjectStage,
} from "../../../../../../enums";
import type { Attachment, Project } from "../../../../../../types";
import { gateButtonProps } from "../../../../../utils/gate-button-props/gate-button-props";
import { AttachmentList } from "../../../../attachment-list/attachment-list";

/**
 * Optional hoàn-công images — they attach independently of the exit. A list, not
 * a bare uploader: a photo you cannot see, replace or delete is worse than none,
 * and deleting the object only ever happens through DELETE on a row.
 */
export function FinishPhotos({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  return (
    <AttachmentList
      projectId={project.id}
      kind={AttachmentKind.FINISH_IMAGE}
      initial={attachments.filter(
        (a) => a.kind === AttachmentKind.FINISH_IMAGE
      )}
      title="Ảnh hoàn công (tùy chọn)"
      emptyMessage="Chưa có ảnh hoàn công."
      withNote
      uploadLabel="Ảnh hoàn công"
    />
  );
}

/**
 * Stage 5's exit — the WORKS_DONE row's action in ExecutionPanel's checklist.
 * `primary` when it is the next row (gate-button-props).
 *
 * One patch stamps `works_done_at` and moves to stage 6 with `request_sent`
 * (the backend does NOT auto-set it). It used to trail the photo form inside
 * the body, indistinguishable from the "Thêm ảnh" beside it.
 *
 * Viewed as a PAST stage (a job moved on by hand without the date), it only
 * backfills `works_done_at`: sending `stage` / `acceptance_sub_status` would
 * drag the job back to Nghiệm thu and overwrite a passed inspection.
 */
export function FinishConfirm({
  project,
  primary,
}: {
  project: Project;
  primary: boolean;
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();

  // The completion day is a real datum — it drives nghiệm thu and the quyết
  // toán — so the operator sees it and can back-date it. It used to be a bare
  // `new Date()` stamped invisibly, with nothing in the UI able to correct it.
  const [doneDate, setDoneDate] = useState(todayISO);

  useServerAction(state, isPending, ACTION_TOAST_TITLES);

  const pastExecution =
    PROJECT_STAGE_ORDER.indexOf(project.stage) >
    PROJECT_STAGE_ORDER.indexOf(ProjectStage.EXECUTION);

  // At Thi công: one patch closes it out and opens nghiệm thu. Past it: only
  // the date, never a stage move (see the doc comment).
  const confirmFinished = () =>
    startTransition(() =>
      formAction(
        pastExecution
          ? { works_done_at: localISO(doneDate, nowHHmm()) }
          : {
              works_done_at: localISO(doneDate, nowHHmm()),
              stage: ProjectStage.ACCEPTANCE,
              acceptance_sub_status: AcceptanceSubStatus.REQUEST_SENT,
            }
      )
    );

  return (
    <>
      <ConfirmAction
        trigger={
          <Button {...gateButtonProps(primary)} disabled={isPending}>
            <CircleCheckBig className="size-4" />
            Xác nhận hoàn tất thi công
          </Button>
        }
        title="Xác nhận hoàn tất thi công"
        consequence={
          pastExecution
            ? `Ghi ngày hoàn tất thi công là ${formatDate(doneDate)}. Công trình giữ nguyên giai đoạn hiện tại.`
            : `Đóng giai đoạn Thi công vào ngày ${formatDate(doneDate)} và mở Nghiệm thu (đã gửi yêu cầu). Không có nút quay lại — muốn sửa phải chuyển giai đoạn thủ công.`
        }
        confirmLabel="Hoàn tất thi công"
        pending={isPending}
        confirmDisabled={!doneDate}
        onConfirm={confirmFinished}
      >
        <div className="space-y-1">
          <Label htmlFor="works-done-date">Ngày hoàn tất</Label>
          <DateInput
            id="works-done-date"
            value={doneDate}
            onChange={setDoneDate}
          />
        </div>
      </ConfirmAction>
    </>
  );
}

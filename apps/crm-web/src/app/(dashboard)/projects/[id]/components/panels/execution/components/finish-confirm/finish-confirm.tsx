"use client";

import { CircleCheckBig } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Label } from "@yan/ui/components/label";

import { AttachmentUpload } from "@/components/attachment-upload/attachment-upload";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { PHOTO_TEXT } from "@/constants/labels";
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
import type { Project } from "../../../../../../types";

/** Optional hoàn-công images — they attach independently of the exit. */
export function FinishPhotos({ project }: { project: Project }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{PHOTO_TEXT.hint}</p>
      <AttachmentUpload
        projectId={project.id}
        kind={AttachmentKind.FINISH_IMAGE}
        label="Ảnh hoàn công (tùy chọn)"
        withNote
        buttonLabel="Thêm ảnh"
      />
    </div>
  );
}

/**
 * Stage 5's exit, rendered in the StageCard footer by ExecutionPanel.
 *
 * One patch stamps `works_done_at` and moves to stage 6 with `request_sent`
 * (the backend does NOT auto-set it). It used to trail the photo form inside
 * the body, indistinguishable from the "Thêm ảnh" beside it.
 */
export function FinishConfirm({ project }: { project: Project }) {
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

  // One patch closes out thi công and opens nghiệm thu.
  const confirmFinished = () =>
    startTransition(() =>
      formAction({
        works_done_at: localISO(doneDate, nowHHmm()),
        stage: ProjectStage.ACCEPTANCE,
        acceptance_sub_status: AcceptanceSubStatus.REQUEST_SENT,
      })
    );

  return (
    <>
      <ConfirmAction
        trigger={
          <Button disabled={isPending}>
            <CircleCheckBig className="size-4" />
            Xác nhận hoàn tất thi công
          </Button>
        }
        title="Xác nhận hoàn tất thi công"
        consequence={`Đóng giai đoạn Thi công vào ngày ${formatDate(doneDate)} và mở Nghiệm thu (đã gửi yêu cầu). Không có nút quay lại — muốn sửa phải chuyển giai đoạn thủ công.`}
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

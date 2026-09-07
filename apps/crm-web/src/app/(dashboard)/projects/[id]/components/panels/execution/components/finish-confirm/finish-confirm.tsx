"use client";

import { CircleCheckBig, Plus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { FIELDS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { localISO, nowHHmm, todayISO } from "@/utils/today-iso/today-iso";

import { addAttachment } from "../../../../../../actions/attachments";
import { updateProject } from "../../../../../../actions/update-project";
import {
  AcceptanceSubStatus,
  AttachmentKind,
  ProjectStage,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";

/**
 * Exit: a single patch stamps `works_done_at` and moves to stage 7 with
 * `request_sent` (the backend does NOT auto-set it). Finish images are optional
 * and attach independently.
 */
export function FinishConfirm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [attState, attAction] = useActionState(
    addAttachment.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [, startAtt] = useTransition();

  const [filename, setFilename] = useState("");
  const [imgNote, setImgNote] = useState("");
  // The completion day is a real datum — it drives nghiệm thu and the quyết
  // toán — so the operator sees it and can back-date it. It used to be a bare
  // `new Date()` stamped invisibly, with nothing in the UI able to correct it.
  const [doneDate, setDoneDate] = useState(todayISO);

  useServerAction(state, isPending, ACTION_TOAST_TITLES);
  useServerAction(attState, false, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => {
      setFilename("");
      setImgNote("");
    },
  });

  const addImage = () => {
    if (!filename.trim()) return;
    const note = imgNote.trim();
    startAtt(() =>
      attAction({
        kind: AttachmentKind.FINISH_IMAGE,
        filename: filename.trim(),
        note: note || undefined,
      })
    );
  };

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
    <section className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="works-done-photo" className="text-muted-foreground">
          Ảnh hoàn công (tùy chọn)
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="works-done-photo"
            value={filename}
            placeholder="Tên tệp ảnh…"
            className="h-8 w-48"
            onChange={(e) => setFilename(e.target.value)}
          />
          <Input
            value={imgNote}
            placeholder={FIELDS.note}
            className="h-8 w-48"
            onChange={(e) => setImgNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!filename.trim()}
            onClick={addImage}
          >
            <Plus className="size-4" />
            Thêm ảnh
          </Button>
        </div>
      </div>

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
    </section>
  );
}

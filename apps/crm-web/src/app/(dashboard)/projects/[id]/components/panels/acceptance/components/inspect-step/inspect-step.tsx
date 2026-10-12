"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";

import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentUpload } from "@/components/attachments/attachment-upload/attachment-upload";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { FieldLabel } from "@/components/form-bits/form-bits";
import { formatDate } from "@/utils/format-date/format-date";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { gateButtonProps } from "../../../../../utils/gate-button-props/gate-button-props";
import { useAcceptanceAction } from "../../hooks/use-acceptance-action/use-acceptance-action";
import { acceptanceHistory } from "../../utils/acceptance-history/acceptance-history";
import { ReworkForm } from "../rework-form/rework-form";

/** Bước 2 while open: inspect with the client, then Đạt or rework. */
export function InspectStep({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  const inRework = project.acceptance_sub_status === AcceptanceSubStatus.REWORK;
  const [formOpen, setFormOpen] = useState(false);
  const [newDate, setNewDate] = useState(
    project.acceptance_scheduled_date ?? ""
  );
  const { run, pending } = useAcceptanceAction({ projectId: project.id });

  const latestRework = acceptanceHistory({ notes: project.notes }).find(
    (n) => n.tag === AcceptanceNoteTag.REWORK
  );

  // Moves the appointment; the old date stays in the history.
  const handleReschedule = () =>
    run({
      patch: { acceptance_scheduled_date: newDate },
      note: {
        tag: AcceptanceNoteTag.RESCHEDULED,
        body: `Đổi ngày hẹn nghiệm thu ${formatDate(newDate)}`,
      },
    });

  // Client agreed: on to the signed minutes. Undoable with "Quay lại".
  const handleAgreed = () =>
    run({
      patch: { acceptance_sub_status: AcceptanceSubStatus.SIGNING },
      note: { tag: AcceptanceNoteTag.AGREED, body: "Nghiệm thu Đạt" },
    });

  // Rework finished: back to inspecting.
  const handleReworkDone = () =>
    run({
      patch: { acceptance_sub_status: AcceptanceSubStatus.INSPECTING },
      note: {
        tag: AcceptanceNoteTag.REWORK_DONE,
        body: "Đã sửa xong, nghiệm thu lại",
      },
    });

  const handleOpenForm = () => setFormOpen(true);
  const handleCloseForm = () => setFormOpen(false);

  const dateId = `reschedule-${project.id}`;
  const scheduled = formatDate(project.acceptance_scheduled_date);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {scheduled ? (
          <span className="text-sm">Ngày hẹn: {scheduled}</span>
        ) : null}
        <ConfirmAction
          trigger={
            <Button variant="ghost" size="sm">
              Đổi ngày hẹn
            </Button>
          }
          title="Đổi ngày hẹn nghiệm thu?"
          consequence="Ghi ngày hẹn mới vào lịch sử."
          confirmLabel="Đổi ngày hẹn"
          pending={pending}
          confirmDisabled={!newDate}
          onConfirm={handleReschedule}
        >
          <div className="space-y-1.5">
            <FieldLabel htmlFor={dateId} required>
              Ngày hẹn mới
            </FieldLabel>
            <DateInput id={dateId} value={newDate} onChange={setNewDate} />
          </div>
        </ConfirmAction>
      </div>

      {inRework ? (
        <>
          {latestRework ? (
            <blockquote className="rounded-lg bg-waiting-soft p-3 text-sm text-waiting">
              <span className="font-medium">
                Khách báo ngày {formatDate(latestRework.created_at).slice(0, 5)}
                :
              </span>{" "}
              {latestRework.body}
            </blockquote>
          ) : null}
          <AttachmentList
            owner={{ project_id: project.id }}
            kind={AttachmentKind.DEFECT_IMAGE}
            initial={attachments.filter(
              (a) => a.kind === AttachmentKind.DEFECT_IMAGE
            )}
            title="Ảnh lỗi cần sửa"
            emptyMessage="Chưa có ảnh lỗi."
            addable={false}
          />
          <div className="space-y-1">
            <AttachmentUpload
              owner={{ project_id: project.id }}
              kind={AttachmentKind.FINISH_IMAGE}
              label="Ảnh sau khi sửa"
              withNote
            />
            <p className="text-xs text-muted-foreground">
              Không bắt buộc, lưu vào “Ảnh hoàn công”.
            </p>
          </div>
          <Button
            {...gateButtonProps(true)}
            disabled={pending}
            onClick={handleReworkDone}
          >
            Đã sửa xong, nghiệm thu lại
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Đi nghiệm thu công trình cùng khách vào ngày hẹn. Xong thì chọn kết
            quả:
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              {...gateButtonProps(true)}
              disabled={pending || formOpen}
              onClick={handleAgreed}
            >
              Nghiệm thu Đạt
            </Button>
            {formOpen ? null : (
              <Button variant="outline" onClick={handleOpenForm}>
                Khách báo lỗi, cần sửa…
              </Button>
            )}
          </div>
          {formOpen ? (
            <ReworkForm project={project} onClose={handleCloseForm} />
          ) : null}
        </>
      )}
    </div>
  );
}

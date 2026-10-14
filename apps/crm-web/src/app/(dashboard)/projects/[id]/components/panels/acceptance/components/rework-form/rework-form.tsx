"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { Textarea } from "@yan/ui/components/textarea";

import { AttachmentUpload } from "@/components/attachments/attachment-upload/attachment-upload";
import { AttachmentKind } from "@/components/attachments/enums";
import { FieldLabel } from "@/components/form-bits/form-bits";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { gateButtonProps } from "../../../../../utils/gate-button-props/gate-button-props";
import { useAcceptanceAction } from "../../hooks/use-acceptance-action/use-acceptance-action";

/** Inline form (not a dialog): what the client found, then on to rework. */
export function ReworkForm({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const { run, pending } = useAcceptanceAction({
    projectId: project.id,
    onSuccess: onClose,
  });

  // Note first (it is the reason), then the status change.
  const handleSave = () =>
    run({
      noteFirst: true,
      note: { tag: AcceptanceNoteTag.REWORK, body: body.trim() },
      patch: { acceptance_sub_status: AcceptanceSubStatus.REWORK },
    });

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setBody(e.target.value);

  const noteId = `rework-note-${project.id}`;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1.5">
        <FieldLabel htmlFor={noteId} required>
          Khách phản ánh gì (bắt buộc)
        </FieldLabel>
        <Textarea
          id={noteId}
          rows={3}
          value={body}
          placeholder="VD: ố kính tầng 15, còn bụi khu vực sảnh…"
          required
          onChange={handleBodyChange}
        />
      </div>
      <AttachmentUpload
        owner={{ project_id: project.id }}
        kind={AttachmentKind.DEFECT_IMAGE}
        label="Ảnh lỗi cần sửa (tùy chọn)"
        withNote
      />
      <div className="flex flex-wrap gap-2">
        <Button
          {...gateButtonProps(true)}
          disabled={pending || !body.trim()}
          onClick={handleSave}
        >
          Lưu và chuyển sang sửa lỗi
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Thôi
        </Button>
      </div>
    </div>
  );
}

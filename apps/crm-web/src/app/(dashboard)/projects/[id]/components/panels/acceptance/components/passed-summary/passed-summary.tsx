import {
  AttachmentDownload,
  attachmentName,
} from "@/components/attachments/attachment-upload/attachment-upload";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { formatDate } from "@/utils/format-date/format-date";

import { AcceptanceNoteTag } from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { acceptanceHistory } from "../../utils/acceptance-history/acceptance-history";

/** Extra lines under Bước 2 and 3 when the stage is viewed after it passed. */
export function ReworkLines({ project }: { project: Project }) {
  const notes = acceptanceHistory({ notes: project.notes })
    .filter((n) => n.tag === AcceptanceNoteTag.REWORK)
    .reverse();
  return (
    <>
      {notes.map((n) => (
        <span key={n.id} className="block">
          {formatDate(n.created_at).slice(0, 5)} · {n.body}
        </span>
      ))}
    </>
  );
}

export function ReportLines({ attachments }: { attachments: Attachment[] }) {
  return (
    <>
      {attachments
        .filter((a) => a.kind === AttachmentKind.ACCEPTANCE_REPORT)
        .map((a) => (
          <span key={a.id} className="block">
            <AttachmentDownload id={a.id} name={attachmentName(a.s3_key)} />
          </span>
        ))}
    </>
  );
}

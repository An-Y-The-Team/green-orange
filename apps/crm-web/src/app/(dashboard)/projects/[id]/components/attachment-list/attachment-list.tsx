"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";

import { EmptyState } from "@/components/empty-state/empty-state";
import { ACTIONS, PHOTO_TEXT } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { deleteAttachment } from "../../../actions/attachments";
import type { AttachmentKind } from "../../../enums";
import type { Attachment } from "../../../types";
import {
  AttachmentDownload,
  AttachmentUpload,
  attachmentName,
} from "../attachment-upload/attachment-upload";

/**
 * Files of one kind: the list, the download links, the delete buttons and the
 * uploader that adds to it.
 *
 * Every stage that takes a file renders this. The uploader alone is not enough —
 * nghiệm thu and hoàn công shipped with an `AttachmentUpload` and no list, so a
 * user who attached the wrong biên bản could not see it, replace it or delete
 * it, and the object stayed in the bucket forever (deleting the object only
 * happens via DELETE on a row).
 */
interface AttachmentListProps {
  projectId: number;
  kind: AttachmentKind;
  /** Server-fetched rows of this kind; the list owns them from then on. */
  initial: Attachment[];
  title: string;
  emptyMessage: string;
  /** Second field for the "— ghi chú" the photo lists print beside the name. */
  withNote?: boolean;
  /** Label on the file picker inside the add block. */
  uploadLabel?: string;
}

export function AttachmentList({
  projectId,
  kind,
  initial,
  title,
  emptyMessage,
  withNote = false,
  uploadLabel,
}: AttachmentListProps) {
  const [rows, setRows] = useState<Attachment[]>(initial);
  const [showAdd, setShowAdd] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [delState, delAction] = useActionState(
    (prev: ServerActionState, id: number) =>
      deleteAttachment(id, projectId, prev),
    INITIAL_ACTION_STATE
  );
  const [delPending, startDel] = useTransition();
  useServerAction(delState, delPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data: { id: number }) =>
      setRows((prev) => prev.filter((r) => r.id !== data.id)),
  });

  // Remembers which row is going away so only that button shows as pending.
  const handleDelete = (id: number) => {
    setDeletingId(id);
    startDel(() => delAction(id));
  };

  const handleUploaded = (a: Attachment) => {
    setRows((prev) => [a, ...prev]);
    setShowAdd(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{`${title} (${rows.length})`}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
        >
          {PHOTO_TEXT.add}
        </Button>
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <AttachmentDownload id={a.id} name={attachmentName(a.s3_key)} />
              {a.note ? (
                <span className="text-muted-foreground">{`— "${a.note}"`}</span>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                disabled={delPending && deletingId === a.id}
                onClick={() => handleDelete(a.id)}
              >
                {ACTIONS.delete}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message={emptyMessage} />
      )}

      {showAdd ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{PHOTO_TEXT.hint}</p>
          <AttachmentUpload
            projectId={projectId}
            kind={kind}
            label={uploadLabel}
            withNote={withNote}
            buttonLabel={ACTIONS.add}
            onUploaded={handleUploaded}
          />
        </div>
      ) : null}
    </div>
  );
}

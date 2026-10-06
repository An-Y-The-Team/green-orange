"use client";

import { Paperclip } from "lucide-react";
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

import { deleteAttachment } from "../actions";
import {
  AttachmentDownload,
  AttachmentUpload,
  attachmentName,
} from "../attachment-upload/attachment-upload";
import type { AttachmentKind } from "../enums";
import type { Attachment, AttachmentLink, AttachmentOwner } from "../types";

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
  owner: AttachmentOwner;
  kind: AttachmentKind;
  /** The record these files document — also how `initial` was filtered. */
  link?: AttachmentLink;
  /** Server-fetched rows of this kind; the list owns them from then on. */
  initial: Attachment[];
  title: string;
  emptyMessage: string;
  /**
   * For a table row: a paperclip + count that opens the list in place, so a
   * row of a contract, milestone or bill stays one line until someone looks.
   * A native `<details>`, not a button: a closed job's `<fieldset disabled>`
   * disables buttons, and its files must stay openable.
   */
  compact?: boolean;
  /** Second field for the "— ghi chú" the photo lists print beside the name. */
  withNote?: boolean;
  /** Label on the file picker inside the add block. */
  uploadLabel?: string;
}

export function AttachmentList({
  owner,
  kind,
  link,
  initial,
  title,
  emptyMessage,
  compact = false,
  withNote = false,
  uploadLabel,
}: AttachmentListProps) {
  const [rows, setRows] = useState<Attachment[]>(initial);
  const [showAdd, setShowAdd] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [delState, delAction] = useActionState(
    (prev: ServerActionState, id: number) => deleteAttachment(id, owner, prev),
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

  const label = `${title} (${rows.length})`;

  const body = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{label}</h3>
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
            owner={owner}
            kind={kind}
            link={link}
            label={uploadLabel}
            withNote={withNote}
            buttonLabel={ACTIONS.add}
            onUploaded={handleUploaded}
          />
        </div>
      ) : null}
    </div>
  );

  if (!compact) return body;
  return (
    <details>
      <summary
        title={label}
        aria-label={label}
        className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        <Paperclip className="size-4" />
        {rows.length}
      </summary>
      <div className="mt-2 min-w-72">{body}</div>
    </details>
  );
}

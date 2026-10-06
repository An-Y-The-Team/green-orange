"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Paperclip } from "lucide-react";
import {
  type ReactNode,
  useActionState,
  useCallback,
  useState,
  useTransition,
} from "react";

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

// Past this many rows only the ones on screen are rendered (frontend-code-style
// "Rendering Large Lists") — a busy job's site log can reach the 500-row fetch cap.
const VIRTUALIZE_AFTER = 100;

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
  /**
   * The record this list belongs to ("HĐ-001", "Cọc", "v2") — joined into the
   * heading and the compact summary's accessible name, so ten paperclips in one
   * table don't all announce the same "Hợp đồng đã ký (1)".
   */
  target?: string;
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
  /** False = list + delete only (the Giấy tờ overview; uploads belong to a stage). */
  addable?: boolean;
  /** Per-row muted text naming the record a file documents, by attachment id. */
  recordLabels?: Record<number, string>;
}

export function AttachmentList({
  owner,
  kind,
  link,
  initial,
  title,
  target,
  emptyMessage,
  compact = false,
  withNote = false,
  uploadLabel,
  addable = true,
  recordLabels,
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

  const label = target
    ? `${title} — ${target} (${rows.length})`
    : `${title} (${rows.length})`;

  const renderRow = (a: Attachment) => (
    <>
      <AttachmentDownload id={a.id} name={attachmentName(a.s3_key)} />
      {recordLabels?.[a.id] ? (
        <span className="text-muted-foreground">{recordLabels[a.id]}</span>
      ) : null}
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
    </>
  );

  const body = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{label}</h3>
        {addable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdd((v) => !v)}
          >
            {PHOTO_TEXT.add}
          </Button>
        ) : null}
      </div>

      {rows.length > VIRTUALIZE_AFTER ? (
        <VirtualRows rows={rows} renderRow={renderRow} />
      ) : rows.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              {renderRow(a)}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message={emptyMessage} />
      )}

      {addable && showAdd ? (
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

/**
 * The long-list branch: rows positioned inside a <ul> sized to the whole list,
 * scrolled by the page itself (no inner scroll box inside a card).
 */
function VirtualRows({
  rows,
  renderRow,
}: {
  rows: Attachment[];
  renderRow: (a: Attachment) => ReactNode;
}) {
  // Where the list starts on the page, which window scrolling is measured from.
  // Re-read whenever the page resizes — a panel above expanding, or the closed
  // compact <details> around this list opening — since a stale offset renders
  // the wrong slice. A ref callback with cleanup, not an effect.
  const [scrollMargin, setScrollMargin] = useState(0);
  const trackOffset = useCallback((el: HTMLUListElement) => {
    const ro = new ResizeObserver(() =>
      setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
    );
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 40,
    overscan: 8,
    scrollMargin,
    getItemKey: (i) => rows[i].id,
    // The server render has no window; start from the top on both sides so
    // hydration matches, then the real offset is observed after mount.
    initialOffset: 0,
  });

  return (
    <ul
      ref={trackOffset}
      className="relative text-sm"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((item) => (
        <li
          key={item.key}
          data-index={item.index}
          ref={virtualizer.measureElement}
          className="absolute top-0 left-0 flex w-full items-center gap-2 pb-1"
          style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
        >
          {renderRow(rows[item.index])}
        </li>
      ))}
    </ul>
  );
}

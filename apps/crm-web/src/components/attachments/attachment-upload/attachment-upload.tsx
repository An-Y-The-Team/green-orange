"use client";

import { Loader2, Paperclip, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { FIELDS } from "@/constants/labels";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";

import type { AttachmentKind } from "../enums";
import type { Attachment, AttachmentLink, AttachmentOwner } from "../types";
import { uploadAttachment } from "../upload-attachment/upload-attachment";
import { ACCEPT, MAX_BYTES } from "./attachment-types";

/**
 * The one place a file becomes an `Attachment`. Every screen that collects a
 * file — khảo sát photos, signed contracts, payment proofs, CCCD scans — renders
 * this instead of keeping its own copy of the form; there used to be three, each
 * asking the user to *type* a filename because there was no bucket behind them.
 *
 * Deliberately NOT `useActionState`: the flow is presign → PUT to the bucket →
 * record the row, and a single action state cannot straddle a browser fetch in
 * the middle. Plain `useTransition` + `toast`, no `useEffect` (AGENTS.md).
 */

/** Stable toast id: a retried upload would otherwise stack one identical toast
 *  per click. */
const UPLOAD_ERROR_TOAST = "attachment-upload-error";

interface AttachmentUploadProps {
  owner: AttachmentOwner;
  kind: AttachmentKind;
  /** The record this file documents, when its kind needs one. */
  link?: AttachmentLink;
  /** Shown above the picker. Omit for a bare row. */
  label?: string;
  /** Second field for the "— ghi chú" the photo lists print beside the name. */
  withNote?: boolean;
  buttonLabel?: string;
  onUploaded?: (attachment: Attachment) => void;
}

export function AttachmentUpload({
  owner,
  kind,
  link = {},
  label,
  withNote = false,
  buttonLabel = "Tải lên",
  onUploaded,
}: AttachmentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = () => {
    if (!file) return;

    start(async () => {
      const result = await uploadAttachment({ owner, link, kind, file, note });
      if (!result.ok) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          id: UPLOAD_ERROR_TOAST,
          description: result.message,
        });
        // An oversized file can never succeed — clear the picker.
        if (file.size > MAX_BYTES) reset();
        return;
      }

      toast.success(ACTION_TOAST_TITLES.successToastTitle, {
        description: result.message,
      });
      reset();
      onUploaded?.(result.attachment);
    });
  };

  // Unique per owner + kind + linked record: a contract panel renders one
  // picker per contract row, and duplicate ids break the label association.
  const inputId = [
    "attachment",
    kind,
    ...Object.values(owner),
    ...Object.values(link),
  ].join("-");

  return (
    <div className="space-y-1.5">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={pending}
          // Callers that render no visible label still need an accessible name.
          aria-label={label ?? buttonLabel}
          className="h-8 w-56 cursor-pointer file:mr-2 file:cursor-pointer file:text-xs"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {withNote ? (
          <Input
            id={`${inputId}-note`}
            value={note}
            placeholder={FIELDS.note}
            aria-label={FIELDS.note}
            disabled={pending}
            className="h-8 min-w-40 flex-1"
            onChange={(e) => setNote(e.target.value)}
          />
        ) : null}
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !file}
          onClick={upload}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

/** The filename to print for a stored key — the last path segment, never the uuid. */
export const attachmentName = (s3Key: string): string =>
  s3Key.split("/").pop() || s3Key;

/**
 * Download link. A real `<a>`, not a button: the signed URL is minted by
 * `/api/attachments/[id]/download`, which 302s to the bucket. That keeps it
 * clickable inside the `<fieldset disabled>` a closed job renders (view actions
 * are meant to survive — see `stage-panel.tsx`) and avoids the popup blocker
 * that silently eats a `window.open` issued after an await.
 *
 * New tab: pdf/photos are served `inline`, so a same-tab link would swap the
 * whole workspace (and any half-typed form) for a signed URL that dies in 5
 * minutes. Office files still just download.
 */
export function AttachmentDownload({ id, name }: { id: number; name: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      title={name}
      render={
        <a
          href={`/api/attachments/${id}/download`}
          target="_blank"
          rel="noopener"
        >
          <Paperclip className="size-4" />
          <span className="max-w-56 truncate">{name}</span>
        </a>
      }
    />
  );
}

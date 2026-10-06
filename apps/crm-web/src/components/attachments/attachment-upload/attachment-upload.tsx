"use client";

import { Loader2, Paperclip, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { FIELDS } from "@/constants/labels";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";

import { addAttachment, presignAttachment } from "../actions";
import type { AttachmentKind } from "../enums";
import type { Attachment, AttachmentLink, AttachmentOwner } from "../types";
import { ACCEPT, MAX_BYTES, guessType } from "./attachment-types";

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
    if (file.size > MAX_BYTES) {
      toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
        id: UPLOAD_ERROR_TOAST,
        description: `Tệp vượt quá ${MAX_BYTES / 1024 / 1024} MB.`,
      });
      reset();
      return;
    }

    // Computed ONCE: the type is part of the signature, so the value sent to
    // presign and the value on the PUT must be byte-identical or the bucket
    // answers 403. Some browsers report "" for .docx/.xlsx, hence the fallback.
    const contentType = file.type || guessType(file.name);

    start(async () => {
      // 1. ask our API to sign an upload for exactly this file
      const signed = await presignAttachment(owner, {
        kind,
        filename: file.name,
        content_type: contentType,
        content_length: file.size,
      });

      if (!signed.success || !signed.data) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          id: UPLOAD_ERROR_TOAST,
          description: signed.message ?? "Không thể tải tệp lên.",
        });
        return;
      }

      // 2. bytes go straight to the bucket — never through Next or crm-api
      const put = await fetch(signed.data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      }).catch(() => null);

      if (!put?.ok) {
        // Keep the reason. The three things that actually fail here — missing
        // bucket CORS, a 403 from VPS clock skew, and a checksum mismatch — are
        // indistinguishable from "no internet" unless the status and the
        // provider's XML body reach the console. DEPLOY.md §6f tells the
        // operator to diagnose a 403 they would otherwise never be shown.
        console.error(
          "[attachment] bucket PUT failed:",
          put
            ? `${put.status} ${put.statusText} ${await put.text()}`
            : "network/CORS"
        );
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          id: UPLOAD_ERROR_TOAST,
          description: put
            ? `Kho lưu trữ từ chối tệp (lỗi ${put.status}). Báo quản trị viên.`
            : "Không kết nối được kho lưu trữ. Kiểm tra mạng rồi thử lại.",
        });
        return;
      }

      // 3. only now does the row exist, so a failed upload leaves no ghost
      const created = await addAttachment(
        owner,
        link,
        { success: false },
        {
          kind,
          s3_key: signed.data.s3_key,
          note: note.trim() || undefined,
        }
      );

      if (!created.success || !created.data) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          id: UPLOAD_ERROR_TOAST,
          description: created.message ?? "Không thể lưu tệp.",
        });
        return;
      }

      toast.success(ACTION_TOAST_TITLES.successToastTitle, {
        description: created.message,
      });
      reset();
      onUploaded?.(created.data);
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
 */
export function AttachmentDownload({ id, name }: { id: number; name: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      title={name}
      render={
        <a href={`/api/attachments/${id}/download`}>
          <Paperclip className="size-4" />
          <span className="max-w-56 truncate">{name}</span>
        </a>
      }
    />
  );
}

"use client";

import { Loader2, Paperclip, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import {
  addAttachment,
  getAttachmentUrl,
  presignAttachment,
} from "@/app/(dashboard)/projects/actions/attachments";
import type { AttachmentKind } from "@/app/(dashboard)/projects/enums";
import type { Attachment } from "@/app/(dashboard)/projects/types";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";

/**
 * The one place a file becomes an `Attachment`. Every stage that collects a file
 * — khảo sát photos, biên bản nghiệm thu, ảnh hoàn công — renders this instead of
 * keeping its own copy of the form; there used to be three, each asking the user
 * to *type* a filename because there was no bucket behind them.
 *
 * Deliberately NOT `useActionState`: the flow is presign → PUT to the bucket →
 * record the row, and a single action state cannot straddle a browser fetch in
 * the middle. Plain `useTransition` + `toast`, no `useEffect` (AGENTS.md).
 */

/** Mirrors ALLOWED_CONTENT_TYPES in both backends; a presign rejects anything else. */
const ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
].join(",");

/** Matches MAX_UPLOAD_BYTES in both backends — checked here only to fail before
 *  a pointless round trip; the signed URL is what actually enforces it. */
const MAX_BYTES = 25 * 1024 * 1024;

interface AttachmentUploadProps {
  projectId: number;
  kind: AttachmentKind;
  paperworkItemId?: number;
  /** Shown above the picker. Omit for a bare row. */
  label?: string;
  /** Second field for the "— ghi chú" the photo lists print beside the name. */
  withNote?: boolean;
  buttonLabel?: string;
  onUploaded?: (attachment: Attachment) => void;
}

export function AttachmentUpload({
  projectId,
  kind,
  paperworkItemId,
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
        description: `Tệp vượt quá ${MAX_BYTES / 1024 / 1024} MB.`,
      });
      return;
    }

    // Computed ONCE: the type is part of the signature, so the value sent to
    // presign and the value on the PUT must be byte-identical or the bucket
    // answers 403. Some browsers report "" for .docx/.xlsx, hence the fallback.
    const contentType = file.type || guessType(file.name);

    start(async () => {
      // 1. ask our API to sign an upload for exactly this file
      const signed = await presignAttachment(projectId, {
        filename: file.name,
        content_type: contentType,
        content_length: file.size,
      });

      if (!signed.success || !signed.data) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
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
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          description:
            "Không thể tải tệp lên kho lưu trữ. Kiểm tra kết nối rồi thử lại.",
        });
        return;
      }

      // 3. only now does the row exist, so a failed upload leaves no ghost
      const created = await addAttachment(
        projectId,
        { success: false },
        {
          kind,
          s3_key: signed.data.s3_key,
          paperwork_item_id: paperworkItemId,
          note: note.trim() || undefined,
        }
      );

      if (!created.success) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          description: created.message ?? "Không thể lưu tệp.",
        });
        return;
      }

      toast.success(ACTION_TOAST_TITLES.successToastTitle, {
        description: created.message,
      });
      reset();
      onUploaded?.(created.data as Attachment);
    });
  };

  const inputId = `attachment-${kind}-${projectId}`;

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
          className="h-8 w-56 cursor-pointer file:mr-2 file:cursor-pointer file:text-xs"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {withNote ? (
          <Input
            value={note}
            placeholder="Ghi chú"
            disabled={pending}
            className="h-8 w-40"
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

/** Extension → MIME, for the browsers that hand us "" on Office files. */
function guessType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return (
    {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    }[ext] ?? "application/octet-stream"
  );
}

/** The filename to print for a stored key — the last path segment, never the uuid. */
export const attachmentName = (s3Key: string): string =>
  s3Key.split("/").pop() || s3Key;

/** Download button: mints a fresh signed URL per click, then opens it. */
export function AttachmentDownload({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      const res = await getAttachmentUrl(id);
      if (!res.success || !res.data) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          description: res.message ?? "Không thể tải tệp.",
        });
        return;
      }
      window.open(res.data.download_url, "_blank", "noopener,noreferrer");
    });

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={open}
      title={name}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Paperclip className="size-4" />
      )}
      <span className="max-w-56 truncate">{name}</span>
    </Button>
  );
}

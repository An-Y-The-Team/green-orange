import { addAttachment, presignAttachment } from "../actions";
import { MAX_BYTES, guessType } from "../attachment-upload/attachment-types";
import type { AttachmentKind } from "../enums";
import type { Attachment, AttachmentLink, AttachmentOwner } from "../types";

export type UploadAttachmentResult =
  | { ok: true; attachment: Attachment; message?: string | null }
  | { ok: false; message: string };

/**
 * A file → an `Attachment`, browser-side: presign → PUT to the bucket → record
 * the row. The bytes go straight to the bucket — never through Next (and its
 * 1 MB action body limit) or crm-api — and the row only exists once they
 * landed, so a failed upload leaves no ghost. Shared by the attachment picker
 * and the "Nhập từ báo giá" import (which files the original workbook).
 */
export async function uploadAttachment({
  owner,
  link = {},
  kind,
  file,
  note,
}: {
  owner: AttachmentOwner;
  link?: AttachmentLink;
  kind: AttachmentKind;
  file: File;
  note?: string;
}): Promise<UploadAttachmentResult> {
  if (file.size > MAX_BYTES)
    return {
      ok: false,
      message: `Tệp vượt quá ${MAX_BYTES / 1024 / 1024} MB.`,
    };

  // Computed ONCE: the type is part of the signature, so the value sent to
  // presign and the value on the PUT must be byte-identical or the bucket
  // answers 403. Some browsers report "" for .docx/.xlsx, hence the fallback.
  const contentType = file.type || guessType(file.name);

  // 1. ask our API to sign an upload for exactly this file
  const signed = await presignAttachment(owner, {
    kind,
    filename: file.name,
    content_type: contentType,
    content_length: file.size,
  });
  if (!signed.success || !signed.data)
    return { ok: false, message: signed.message ?? "Không thể tải tệp lên." };

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
    return {
      ok: false,
      message: put
        ? `Kho lưu trữ từ chối tệp (lỗi ${put.status}). Báo quản trị viên.`
        : "Không kết nối được kho lưu trữ. Kiểm tra mạng rồi thử lại.",
    };
  }

  // 3. only now does the row exist, so a failed upload leaves no ghost
  const created = await addAttachment(
    owner,
    link,
    { success: false },
    { kind, s3_key: signed.data.s3_key, note: note?.trim() || undefined }
  );
  if (!created.success || !created.data)
    return { ok: false, message: created.message ?? "Không thể lưu tệp." };

  return { ok: true, attachment: created.data, message: created.message };
}

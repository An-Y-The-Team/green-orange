/**
 * The one table of file types the CRM accepts, extension → MIME.
 *
 * Everything the picker and the upload flow need is derived from it: `ACCEPT`
 * is its keys, `guessType` is a lookup in it, and the MIME values are exactly
 * what both backends allowlist. It used to be three lists that had to be edited
 * together — an extension list, a MIME map, and the allowlist — so adding
 * `.heic` meant finding all three and the picker would happily offer a file the
 * presign then refused.
 *
 * The two backends keep their own copies (`crm-api-nest/src/common/storage.ts`,
 * `crm-api/app/core/storage.py`) because they are separate services in two
 * languages — the repo's rule for that is "change one, change the other"
 * (AGENTS.md), and `attachment-types.test.ts` fails if this table and that
 * allowlist drift apart.
 */
export const ATTACHMENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;

/** `accept` for the file input — a picker hint, not a check. */
export const ACCEPT = Object.keys(ATTACHMENT_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

/**
 * Extension → MIME, for the browsers that hand us `""` on Office files. The
 * value must be one the backends allow, or the presign answers 400.
 */
export function guessType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return (
    ATTACHMENT_TYPES[ext as keyof typeof ATTACHMENT_TYPES] ??
    "application/octet-stream"
  );
}

/** 25 MB, matching MAX_UPLOAD_BYTES in both backends. Checked here only to fail
 *  before a pointless round trip; the signed URL is what actually enforces it. */
export const MAX_BYTES = 25 * 1024 * 1024;

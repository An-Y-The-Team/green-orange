/**
 * S3 object storage for attachments — the byte plane behind `Attachment.s3_key`.
 * Python counterpart: `apps/crm-api/app/core/storage.py`.
 *
 * Presigned URLs only. The API hands out a short-lived signed URL and the browser
 * talks to the bucket directly, so file bytes never enter this process — required
 * on the 1–2 GB VPS the stack runs on (DEPLOY.md §1), and less code than proxying.
 *
 * The bucket is a Vietnamese provider (Bizfly / Viettel), not S3 proper: keep
 * `forcePathStyle` on, and note that `S3_ENDPOINT` is mandatory — there is no
 * AWS-region default to fall back to.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

/**
 * Long enough to pick a file and upload it on office wifi, short enough that a
 * leaked URL is worthless by the time it is shared.
 */
export const PRESIGN_TTL_SECONDS = 300;

/**
 * 25 MB. Documents, not media — the biggest real .docx in `01. MẪU FILE HỒ SƠ/`
 * is under 1 MB. Raise when site photos arrive (see the S3 plan's skipped list).
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Allowlist, not a blocklist: an unknown type is rejected. Anything not here
 * cannot be signed for, so the bucket can only ever hold these.
 */
export const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const bucket = process.env.S3_BUCKET ?? "";

// Module-level singleton: one client per process, built from env at import time.
// Missing config is NOT fatal at boot — the rest of the API must still run for a
// developer with no bucket. It fails loudly at the first presign instead.
const client = process.env.S3_ENDPOINT
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "hcm",
      forcePathStyle: true,
      // Both MUST stay "WHEN_REQUIRED". On the default ("WHEN_SUPPORTED") the
      // flexible-checksums middleware hashes the command's `Body` — which is
      // `undefined` at presign time — and hoists `x-amz-checksum-crc32=AAAAAA==`
      // (the CRC32 of zero bytes) into the SIGNED query string. The browser then
      // PUTs real bytes, the bucket computes a real CRC32, and every upload dies
      // with 400 BadDigest. The client cannot strip it: it is inside the
      // signature. boto3 adds no such parameter, so this also keeps the two
      // backends minting the same URL shape (AGENTS.md).
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    })
  : undefined;

export const storageConfigured = Boolean(client && bucket);

function requireClient(): S3Client {
  if (!client || !bucket)
    throw new Error(
      "Object storage is not configured — set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY"
    );
  return client;
}

// Path separators would escape the project prefix; control characters and a
// leading dot make the key unusable in a URL and in Content-Disposition.
// Vietnamese letters are kept — every template in the repo is named in Vietnamese.
const SEPARATORS = /[/\\]/g;
const CONTROL = /[\x00-\x1f\x7f]/g;

/**
 * Who a file belongs to. Exactly one is set — the DB enforces it with a CHECK
 * (`attachment_one_owner`). An `Attachment` row satisfies this shape as-is.
 */
export interface Owner {
  project_id?: number | null;
  crew_member_id?: number | null;
}

const ownerPrefix = (owner: Owner): string =>
  owner.project_id != null
    ? `projects/${owner.project_id}`
    : `crew/${owner.crew_member_id}`;

/**
 * `{projects|crew}/{id}/{kind}/{uuid}/{filename}` — the owner and kind segments
 * make the bucket browsable by category (and an orphan sweep a prefix listing);
 * the uuid keeps two uploads of the same filename apart without renaming either,
 * so the last segment stays the human filename the UI prints (`basename`).
 */
export function buildKey(owner: Owner, kind: string, filename: string): string {
  const cleaned = filename
    .replace(SEPARATORS, "-")
    .replace(CONTROL, "")
    .replace(/^\.+/, "")
    .trim();
  // Spread first: `.slice` counts UTF-16 units, so cutting at 120 in the middle
  // of a surrogate pair leaves a lone surrogate, and `encodeURIComponent` then
  // throws URIError — a 500 on "…😀.pdf". Python's `[:120]` counts code points,
  // so slicing by code point is also what keeps the two backends agreeing.
  const safe = [...cleaned].slice(0, 120).join("") || "tep";
  return `${ownerPrefix(owner)}/${kind}/${randomUUID()}/${safe}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY_SHAPE = new RegExp(`^((?:projects|crew)/\\d+)/([a-z_]+)/${UUID}/[^/]+$`);
// Before 2026-10 keys carried no kind segment. Such rows still download.
const LEGACY_KEY_SHAPE = new RegExp(`^(projects/\\d+)/${UUID}/[^/]+$`);

/**
 * Does this key look like one WE minted, for THIS owner and kind?
 *
 * `POST /attachments` takes `s3_key` from the client, and `DELETE` removes the
 * object that key names. Without this check a caller could record a row
 * pointing at someone else's object and then delete it — the bytes vanish while
 * the victim's row survives, so nothing in the UI shows the loss. Checking the
 * shape is enough: the uuid segment is unguessable, so a key that matches was
 * minted by `presignPut` for this owner.
 */
export function isOwnKey(owner: Owner, kind: string, key: string): boolean {
  const match = KEY_SHAPE.exec(key);
  if (match) return match[1] === ownerPrefix(owner) && match[2] === kind;
  return LEGACY_KEY_SHAPE.exec(key)?.[1] === ownerPrefix(owner);
}

/**
 * Signed PUT. `contentType` and `contentLength` are part of the signature, so a
 * client that lies about either gets a 403 from the bucket, not a stored file.
 */
export function presignPut(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  return getSignedUrl(
    requireClient(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    {
      expiresIn: PRESIGN_TTL_SECONDS,
      // Without this the presigner signs only `host` and `content-length`, and
      // the allowlist becomes advisory: a URL issued for a .pdf would happily
      // accept a .exe. Naming content-type here puts it in X-Amz-SignedHeaders,
      // so the bucket rejects a PUT whose type is not the one we approved.
      signableHeaders: new Set(["content-type", "content-length"]),
    }
  );
}

/**
 * Signed GET. `filename` drives the download name so the browser does not save
 * the uuid segment as the file's name.
 */
/**
 * RFC 5987 `ext-value`. `encodeURIComponent` leaves `'()!*` alone, and `'` is
 * the delimiter in `UTF-8''<name>` — so "Nghiệm'thu.pdf" would truncate the
 * download name in the browser. Python's `quote(…, safe="")` escapes these, so
 * escaping them here is also what keeps both backends naming the file the same.
 */
const rfc5987 = (s: string): string =>
  encodeURIComponent(s).replace(
    /['()!*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

// What a browser renders itself — a photo or a scan opens in a tab instead of
// landing in Downloads. Office files have no viewer, so they stay `attachment`.
const INLINE = /\.(pdf|png|jpe?g|webp)$/i;

export const contentDisposition = (filename: string): string =>
  `${INLINE.test(filename) ? "inline" : "attachment"}; filename*=UTF-8''${rfc5987(filename)}`;

export function presignGet(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    requireClient(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition(filename),
    }),
    { expiresIn: PRESIGN_TTL_SECONDS }
  );
}

/**
 * Best-effort delete — a failure here must not block removing the metadata row.
 * An orphaned object costs ~1,000đ/GB/month; a row that cannot be deleted blocks
 * the user. Sweep orphans with a bucket lifecycle rule if it ever matters.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!client || !bucket) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error(`[storage] delete failed for ${key}:`, err);
  }
}

/** Last path segment — what the UI shows instead of the full key. */
export const basename = (key: string): string => key.split("/").pop() || key;

"""S3 object storage for attachments — the byte plane behind `Attachment.s3_key`.

NestJS counterpart: `apps/crm-api-nest/src/common/storage.ts`. Per AGENTS.md the
two backends implement the same contract; change one, change the other.

Presigned URLs only. The API hands out a short-lived signed URL and the browser
talks to the bucket directly, so file bytes never enter this process.

The bucket is a Vietnamese provider (Bizfly / Viettel), not S3 proper: path-style
addressing is required, and `s3_endpoint` is mandatory — there is no AWS region
to fall back to.
"""

import re
import uuid
from functools import lru_cache
from urllib.parse import quote

import boto3
from botocore.config import Config

from app.core.config import settings

# Long enough to pick a file and upload it on office wifi, short enough that a
# leaked URL is worthless by the time it is shared.
PRESIGN_TTL_SECONDS = 300

# 25 MB. Documents, not media — the biggest real .docx in `01. MẪU FILE HỒ SƠ/`
# is under 1 MB.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

# Allowlist, not a blocklist: an unknown type is rejected. Anything not here
# cannot be signed for, so the bucket can only ever hold these.
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.ms-excel",
        "image/png",
        "image/jpeg",
        "image/webp",
    }
)

# Path separators would escape the project prefix; control characters and a
# leading dot make the key unusable in a URL and in Content-Disposition.
# Vietnamese letters are kept — every template in the repo is named in Vietnamese.
_SEPARATORS = re.compile(r"[/\\]")
_CONTROL = re.compile(r"[\x00-\x1f\x7f]")


def storage_configured() -> bool:
    return bool(settings.s3_endpoint and settings.s3_bucket)


@lru_cache(maxsize=1)
def _client():
    """One client per process. Built lazily so the API still boots without a
    bucket — only the presign endpoints fail, and they say why."""
    if not storage_configured():
        raise RuntimeError(
            "Object storage is not configured — set S3_ENDPOINT, S3_BUCKET, "
            "S3_ACCESS_KEY, S3_SECRET_KEY"
        )
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def _owner_prefix(project_id: int | None, crew_member_id: int | None) -> str:
    return (
        f"projects/{project_id}" if project_id is not None else f"crew/{crew_member_id}"
    )


def build_key(
    project_id: int | None, crew_member_id: int | None, kind: str, filename: str
) -> str:
    """`{projects|crew}/{id}/{kind}/{uuid}/{filename}` — the owner and kind
    segments make the bucket browsable by category (and an orphan sweep a prefix
    listing); the uuid keeps two uploads of the same filename apart without
    renaming either, so the last segment stays the human filename (`basename`).
    Exactly one of `project_id` / `crew_member_id` is set."""
    safe = _SEPARATORS.sub("-", filename)
    safe = _CONTROL.sub("", safe)
    safe = safe.lstrip(".").strip()[:120] or "tep"
    prefix = _owner_prefix(project_id, crew_member_id)
    return f"{prefix}/{kind}/{uuid.uuid4()}/{safe}"


_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
# [0-9], not \d (which matches any Unicode digit), and fullmatch, not `$` (which
# also matches before a trailing newline) — so this accepts what the NestJS
# regex does.
_KEY_SHAPE = re.compile(rf"((?:projects|crew)/[0-9]+)/([a-z_]+)/{_UUID}/[^/]+")
# Before 2026-10 keys carried no kind segment. Such rows still download.
_LEGACY_KEY_SHAPE = re.compile(rf"(projects/[0-9]+)/{_UUID}/[^/]+")


def is_own_key(
    project_id: int | None, crew_member_id: int | None, kind: str, key: str
) -> bool:
    """Does this key look like one WE minted, for THIS owner and kind?

    `POST /attachments` takes `s3_key` from the client and `DELETE` removes the
    object it names, so an unchecked key lets a caller record a row over someone
    else's file and then delete their bytes — the row survives, so nothing in the
    UI shows the loss. The uuid segment is unguessable, so a key of this shape
    was minted by `presign_put` for this owner."""
    prefix = _owner_prefix(project_id, crew_member_id)
    if match := _KEY_SHAPE.fullmatch(key):
        return match.group(1) == prefix and match.group(2) == kind
    legacy = _LEGACY_KEY_SHAPE.fullmatch(key)
    return legacy is not None and legacy.group(1) == prefix


def presign_put(key: str, content_type: str, content_length: int) -> str:
    """Signed PUT. The content type and length are part of the signature, so a
    client that lies about either gets a 403 from the bucket, not a stored file."""
    return _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": key,
            "ContentType": content_type,
            "ContentLength": content_length,
        },
        ExpiresIn=PRESIGN_TTL_SECONDS,
    )


# What a browser renders itself — a photo or a scan opens in a tab instead of
# landing in Downloads. Office files have no viewer, so they stay `attachment`.
_INLINE = re.compile(r"\.(pdf|png|jpe?g|webp)$", re.IGNORECASE)


def content_disposition(filename: str) -> str:
    """`safe=""` matters: RFC 5987 uses `'` as the delimiter in `UTF-8''<name>`,
    so an unescaped apostrophe truncates the download name. The NestJS mirror
    escapes the same set by hand (`encodeURIComponent` leaves `'()!*` alone)."""
    mode = "inline" if _INLINE.search(filename) else "attachment"
    return f"{mode}; filename*=UTF-8''{quote(filename, safe='')}"


def presign_get(key: str, filename: str) -> str:
    """Signed GET. `filename` drives the download name so the browser does not
    save the uuid segment as the file's name."""
    return _client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": key,
            "ResponseContentDisposition": content_disposition(filename),
        },
        ExpiresIn=PRESIGN_TTL_SECONDS,
    )


def delete_object(key: str) -> None:
    """Best-effort — a failure here must not block removing the metadata row. An
    orphaned object costs ~1,000đ/GB/month; a row that cannot be deleted blocks
    the user. Sweep orphans with a bucket lifecycle rule if it ever matters."""
    if not storage_configured():
        return
    try:
        _client().delete_object(Bucket=settings.s3_bucket, Key=key)
    except Exception as exc:  # noqa: BLE001 — logged, never surfaced
        print(f"[storage] delete failed for {key}: {exc}")


def basename(key: str) -> str:
    """Last path segment — what the UI shows instead of the full key."""
    return key.rsplit("/", 1)[-1] or key

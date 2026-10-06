"""Attachment rules — who may own a file, what it must link to, which key it may
claim — plus the presign / download / record / delete steps.

No FastAPI here (backend-code-style "Keep Routers Thin"): a refusal is an
`AttachmentRejected`, which app/main.py maps to the same `{"detail": …}` body an
HTTPException would produce. The router (app/api/routes/attachments.py) only
parses, calls in here and schedules the object delete.
NestJS mirror: `AttachmentsController` in src/attachments/attachments.module.ts.
"""

from http import HTTPStatus
from typing import Any

from sqlmodel import Session, select
from sqlmodel.sql.expression import SelectOfScalar

from app.core.rules import assert_project_open
from app.core.storage import (
    ALLOWED_CONTENT_TYPES,
    MAX_UPLOAD_BYTES,
    PRESIGN_TTL_SECONDS,
    basename,
    build_key,
    is_own_key,
    presign_get,
    presign_put,
    storage_configured,
)
from app.models.attachment import (
    ATTACHMENT_KINDS,
    ATTACHMENT_LINKS,
    Attachment,
    AttachmentCreate,
    AttachmentDownloadPublic,
    AttachmentOwner,
    AttachmentPresign,
    AttachmentPresignPublic,
)
from app.models.contract import Contract
from app.models.crew import CrewMember
from app.models.paperwork import PaperworkItem
from app.models.project import Project
from app.models.quote import Quote
from app.models.receivable import Bill, PaymentMilestone


class AttachmentRejected(Exception):
    """A request the attachment rules refuse — status + client-facing detail."""

    def __init__(self, status: HTTPStatus, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


_STORAGE_OFF = (
    "Object storage is not configured — set S3_ENDPOINT, S3_BUCKET, "
    "S3_ACCESS_KEY, S3_SECRET_KEY"
)
# Which table each link column points at — every one carries a project_id.
_LINK_MODELS = {
    "quote_id": Quote,
    "contract_id": Contract,
    "payment_milestone_id": PaymentMilestone,
    "bill_id": Bill,
    "paperwork_item_id": PaperworkItem,
}


def _bad(detail: str) -> AttachmentRejected:
    return AttachmentRejected(HTTPStatus.BAD_REQUEST, detail)


def _assert_owner(session: Session, payload: AttachmentOwner) -> None:
    """The kind decides the owner: a project file needs project_id and no
    crew_member_id, a CCCD the reverse. 400 rather than letting the DB CHECK
    surface as a 500. Then the owner must exist, and a project must be open."""
    crew = ATTACHMENT_KINDS[payload.kind][0] == "crew"
    if (payload.crew_member_id if crew else payload.project_id) is None:
        raise _bad(
            f"kind {payload.kind} needs {'crew_member_id' if crew else 'project_id'}"
        )
    if (payload.project_id if crew else payload.crew_member_id) is not None:
        raise _bad("An attachment has exactly one owner: project_id or crew_member_id")
    if crew:
        if not session.get(CrewMember, payload.crew_member_id):
            raise AttachmentRejected(HTTPStatus.NOT_FOUND, "Crew member not found")
        return
    # assert_project_open only rejects a CLOSED project; a project_id that does
    # not exist passes it silently and would mint signed PUTs for keys no row
    # will ever reference.
    if not session.get(Project, payload.project_id):
        raise AttachmentRejected(HTTPStatus.NOT_FOUND, "Project not found")
    assert_project_open(session, payload.project_id)


def _assert_link(session: Session, payload: AttachmentCreate) -> None:
    """Exactly the kind's link, and it must sit on the same project — otherwise
    another job's contract or milestone would collect this file silently."""
    want = ATTACHMENT_KINDS[payload.kind][1]
    for link in ATTACHMENT_LINKS:
        if link != want and getattr(payload, link) is not None:
            raise _bad(f"kind {payload.kind} takes no {link}")
    if want is None:
        return
    link_id = getattr(payload, want)
    if link_id is None:
        raise _bad(f"kind {payload.kind} needs {want}")
    row = session.get(_LINK_MODELS[want], link_id)
    if not row or row.project_id != payload.project_id:
        raise _bad(f"{want} does not belong to project_id")


def presign(session: Session, payload: AttachmentPresign) -> AttachmentPresignPublic:
    """A short-lived signed PUT; the browser uploads straight to the bucket and
    then records the returned s3_key via `create`. Bytes never pass through.

    The content type and length are signed into the URL, so the checks below are
    not the only line of defence — a client that lies about either is refused by
    the bucket. They run here to fail fast with a sentence instead of a 403.
    """
    # Say which knob is missing. Without this the RuntimeError from the storage
    # client surfaces as a bare 500, and .env.example, config.py and DEPLOY.md
    # §6f all promise the opposite.
    if not storage_configured():
        raise AttachmentRejected(HTTPStatus.SERVICE_UNAVAILABLE, _STORAGE_OFF)
    _assert_owner(session, payload)
    if payload.content_type not in ALLOWED_CONTENT_TYPES:
        raise _bad(f"Unsupported file type: {payload.content_type}")
    if payload.content_length > MAX_UPLOAD_BYTES:
        raise _bad(f"File is larger than {MAX_UPLOAD_BYTES // 1024 // 1024} MB")
    key = build_key(
        payload.project_id, payload.crew_member_id, payload.kind, payload.filename
    )
    return AttachmentPresignPublic(
        upload_url=presign_put(key, payload.content_type, payload.content_length),
        s3_key=key,
        expires_in=PRESIGN_TTL_SECONDS,
    )


def download_url(session: Session, attachment_id: int) -> AttachmentDownloadPublic:
    """Short-lived signed GET for one row — the link the UI opens."""
    attachment = session.get(Attachment, attachment_id)
    if not attachment:
        raise AttachmentRejected(HTTPStatus.NOT_FOUND, "Attachment not found")
    # Rows from the metadata-only era (and the seed) hold a bare filename with no
    # object behind it. Signing one yields a valid URL that opens the provider's
    # raw NoSuchKey XML in a new tab; say so instead.
    if not is_own_key(
        attachment.project_id,
        attachment.crew_member_id,
        attachment.kind,
        attachment.s3_key,
    ):
        raise AttachmentRejected(
            HTTPStatus.NOT_FOUND,
            "This attachment predates file storage — only its name was recorded",
        )
    if not storage_configured():
        raise AttachmentRejected(HTTPStatus.SERVICE_UNAVAILABLE, _STORAGE_OFF)
    return AttachmentDownloadPublic(
        download_url=presign_get(attachment.s3_key, basename(attachment.s3_key)),
        expires_in=PRESIGN_TTL_SECONDS,
    )


def list_statement(*, kind: str | None, **ids: int | None) -> SelectOfScalar:
    """Rows filtered by category and by owner / link ids (`project_id`,
    `crew_member_id`, `contract_id`, …) — e.g. `contract_id=12` is the signed
    scan of contract 12, nothing else. Newest first; the router pages it."""
    # A typo'd kind would otherwise answer an empty list — indistinguishable
    # from "no files yet".
    if kind and kind not in ATTACHMENT_KINDS:
        raise _bad(f"Unknown kind: {kind}")
    statement = select(Attachment)
    filters: dict[str, Any] = {"kind": kind or None, **ids}
    for column, value in filters.items():
        if value is not None:
            statement = statement.where(getattr(Attachment, column) == value)
    return statement.order_by(Attachment.created_at.desc(), Attachment.id.desc())


def create(session: Session, payload: AttachmentCreate) -> Attachment:
    _assert_owner(session, payload)
    _assert_link(session, payload)
    # The key must be one presign_put minted for THIS owner and kind. Deleting
    # the row removes the object this names, so an unchecked key lets a caller
    # record a row over someone else's file and then delete their bytes,
    # leaving their row behind.
    if not is_own_key(
        payload.project_id, payload.crew_member_id, payload.kind, payload.s3_key
    ):
        raise _bad(
            "s3_key was not issued for this owner and kind — upload via "
            "/attachments/presign"
        )
    attachment = Attachment.model_validate(payload)
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    return attachment


def delete(session: Session, attachment_id: int) -> str:
    """Delete the row; return its object key for the caller to remove from the
    bucket AFTER the response (see the router)."""
    attachment = session.get(Attachment, attachment_id)
    if not attachment:
        raise AttachmentRejected(HTTPStatus.NOT_FOUND, "Attachment not found")
    assert_project_open(session, attachment.project_id)  # no-op for crew files
    key = attachment.s3_key
    session.delete(attachment)
    session.commit()
    return key

"""Attachments — metadata rows + presigned S3 upload/download.

Thin by design: the rules live in app/services/attachments.py.
NestJS mirror: `AttachmentsController` in src/attachments/attachments.module.ts.
"""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Response, status

from app.api.common import PageDep, paged
from app.api.deps import SessionDep, get_current_user
from app.core.storage import delete_object
from app.models.attachment import (
    Attachment,
    AttachmentCreate,
    AttachmentDownloadPublic,
    AttachmentPresign,
    AttachmentPresignPublic,
    AttachmentPublic,
)
from app.services import attachments as service

router = APIRouter(
    prefix="/attachments",
    tags=["attachments"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/presign", response_model=AttachmentPresignPublic)
def presign_attachment(
    session: SessionDep, payload: AttachmentPresign
) -> AttachmentPresignPublic:
    return service.presign(session, payload)


@router.get("/{attachment_id}/url", response_model=AttachmentDownloadPublic)
def attachment_download_url(
    session: SessionDep, attachment_id: int
) -> AttachmentDownloadPublic:
    return service.download_url(session, attachment_id)


@router.get("", response_model=list[AttachmentPublic])
def list_attachments(
    session: SessionDep,
    response: Response,
    page: PageDep,
    project_id: Annotated[int | None, Query()] = None,
    crew_member_id: Annotated[int | None, Query()] = None,
    kind: Annotated[str | None, Query()] = None,
    quote_id: Annotated[int | None, Query()] = None,
    contract_id: Annotated[int | None, Query()] = None,
    payment_milestone_id: Annotated[int | None, Query()] = None,
    bill_id: Annotated[int | None, Query()] = None,
    paperwork_item_id: Annotated[int | None, Query()] = None,
) -> list[Attachment]:
    statement = service.list_statement(
        kind=kind,
        project_id=project_id,
        crew_member_id=crew_member_id,
        quote_id=quote_id,
        contract_id=contract_id,
        payment_milestone_id=payment_milestone_id,
        bill_id=bill_id,
        paperwork_item_id=paperwork_item_id,
    )
    return paged(session, response, statement, page)


@router.post("", response_model=AttachmentPublic, status_code=status.HTTP_201_CREATED)
def create_attachment(session: SessionDep, payload: AttachmentCreate) -> Attachment:
    return service.create(session, payload)


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    session: SessionDep, attachment_id: int, background: BackgroundTasks
) -> None:
    key = service.delete(session, attachment_id)
    # After the row, and deliberately off the request: delete_object swallows its
    # own errors, but running it inline puts botocore's retry backoff inside the
    # user's request — a bucket outage would turn a committed delete into a
    # timeout toast for a row that is already gone. (NestJS mirror: `void`.)
    background.add_task(delete_object, key)

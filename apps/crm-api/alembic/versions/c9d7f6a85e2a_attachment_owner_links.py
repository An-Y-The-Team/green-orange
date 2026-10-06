"""Attachments: crew owner + per-record links (uploads everywhere).

An attachment is owned by a project OR a crew member (CCCD / chứng chỉ scans) —
CHECK `attachment_one_owner` — and may link to the exact quote, contract,
payment milestone or bill it documents. Links are ON DELETE SET NULL; so is
`paperwork_item_id` now, which was NO ACTION here (a paperwork item with files
answered 409) while the NestJS twin has always been SET NULL. Mirror of
`crm-api-nest/prisma/migrations/20261006000000_attachment_owner_links`.

Revision ID: c9d7f6a85e2a
Revises: b8c6e5f74d19
Create Date: 2026-10-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d7f6a85e2a"
down_revision: str | None = "b8c6e5f74d19"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (column, target table, ondelete)
_LINKS = (
    ("crew_member_id", "crewmember", None),  # owner: RESTRICT (NO ACTION)
    ("quote_id", "quote", "SET NULL"),
    ("contract_id", "contract", "SET NULL"),
    ("payment_milestone_id", "paymentmilestone", "SET NULL"),
    ("bill_id", "bill", "SET NULL"),
)


def upgrade() -> None:
    op.alter_column("attachment", "project_id", nullable=True)
    for column, target, ondelete in _LINKS:
        op.add_column("attachment", sa.Column(column, sa.Integer(), nullable=True))
        op.create_foreign_key(
            f"attachment_{column}_fkey",
            "attachment",
            target,
            [column],
            ["id"],
            ondelete=ondelete,
        )
        op.create_index(f"ix_attachment_{column}", "attachment", [column])
    op.create_check_constraint(
        "attachment_one_owner",
        "attachment",
        "(project_id IS NULL) <> (crew_member_id IS NULL)",
    )
    op.drop_constraint(
        "attachment_paperwork_item_id_fkey", "attachment", type_="foreignkey"
    )
    op.create_foreign_key(
        "attachment_paperwork_item_id_fkey",
        "attachment",
        "paperworkitem",
        ["paperwork_item_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "attachment_paperwork_item_id_fkey", "attachment", type_="foreignkey"
    )
    op.create_foreign_key(
        "attachment_paperwork_item_id_fkey",
        "attachment",
        "paperworkitem",
        ["paperwork_item_id"],
        ["id"],
    )
    op.drop_constraint("attachment_one_owner", "attachment", type_="check")
    for column, _, _ in reversed(_LINKS):
        op.drop_index(f"ix_attachment_{column}", "attachment")
        op.drop_constraint(
            f"attachment_{column}_fkey", "attachment", type_="foreignkey"
        )
        op.drop_column("attachment", column)
    # Fails if crew-owned rows exist — delete them first; a downgrade must not
    # silently invent a project for them.
    op.alter_column("attachment", "project_id", nullable=False)

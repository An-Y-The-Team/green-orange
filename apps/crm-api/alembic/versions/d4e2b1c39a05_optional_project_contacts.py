"""Project contacts become optional.

Catches `crm` up with the NestJS twin
(`crm-api-nest/prisma/migrations/20260909000000_optional_project_contacts`). A
behaviour in only one backend is a bug — crm-web is pointed at either by one env
var.

A công trình may now be opened for a company whose contact person is not known
yet: both contact columns drop NOT NULL. Existing rows keep their values, so the
downgrade only works while none is NULL — it backfills nothing, deliberately:
inventing a contact to satisfy the old constraint would be worse than failing.

Revision ID: d4e2b1c39a05
Revises: c3f1a2b45d67
Create Date: 2026-09-09
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e2b1c39a05"
down_revision: str | None = "c3f1a2b45d67"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = ("working_contact_id", "decision_maker_contact_id")


def upgrade() -> None:
    for column in COLUMNS:
        op.alter_column("project", column, existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    for column in COLUMNS:
        op.alter_column("project", column, existing_type=sa.Integer(), nullable=False)

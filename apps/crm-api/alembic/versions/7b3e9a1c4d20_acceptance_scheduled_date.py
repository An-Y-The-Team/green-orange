"""Project gets acceptance_scheduled_date (planned inspection date).

Twin of the NestJS migration
`crm-api-nest/prisma/migrations/20261011000000_acceptance_scheduled_date`.
The `signing` acceptance sub-status needs no schema change (plain text column).

Revision ID: 7b3e9a1c4d20
Revises: 1a2b3c4d5e6f
Create Date: 2026-10-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7b3e9a1c4d20"
down_revision: str | None = "1a2b3c4d5e6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "project", sa.Column("acceptance_scheduled_date", sa.Date(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("project", "acceptance_scheduled_date")

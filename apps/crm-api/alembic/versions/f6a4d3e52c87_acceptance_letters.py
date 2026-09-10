"""Project carries two editable stage-7 letter bodies.

Catches `crm` up with the NestJS twin
(`crm-api-nest/prisma/migrations/20260913000000_acceptance_letters`). A
behaviour in only one backend is a bug — crm-web is pointed at either by one env
var.

The "Thư yêu cầu nghiệm thu" used to be fixed wording; operators now edit it per
công trình, and a second copy goes to the Ban Quản lý tòa nhà. NULL keeps the
web app's built-in text, so existing rows print exactly as before.

Revision ID: f6a4d3e52c87
Revises: e5f3c2d41b76
Create Date: 2026-09-10
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a4d3e52c87"
down_revision: str | None = "e5f3c2d41b76"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = ("acceptance_letter_body", "building_letter_body")


def upgrade() -> None:
    for column in COLUMNS:
        op.add_column("project", sa.Column(column, sa.String(), nullable=True))


def downgrade() -> None:
    for column in COLUMNS:
        op.drop_column("project", column)

"""Each paperwork item names the stage that needs it approved.

Catches `crm` up with the NestJS twin
(`crm-api-nest/prisma/migrations/20261005000000_paperwork_needed_for`). A
behaviour in only one backend is a bug — crm-web is pointed at either by one env
var.

Only "execution" items gate the auto-advance to Thi công. The later-stage
documents seeded up front (đề nghị thanh toán, biên bản nghiệm thu / quyết toán)
are retagged so they no longer block it.

Revision ID: a7b5e4f63d98
Revises: f6a4d3e52c87
Create Date: 2026-10-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7b5e4f63d98"
down_revision: str | None = "f6a4d3e52c87"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "paperworkitem",
        sa.Column(
            "needed_for", sa.String(), nullable=False, server_default="execution"
        ),
    )
    op.execute(
        "UPDATE paperworkitem SET needed_for = 'acceptance' "
        "WHERE name = 'Biên bản nghiệm thu khối lượng'"
    )
    op.execute(
        "UPDATE paperworkitem SET needed_for = 'settlement' "
        "WHERE name IN ('Đề nghị thanh toán', 'Biên bản quyết toán')"
    )


def downgrade() -> None:
    op.drop_column("paperworkitem", "needed_for")

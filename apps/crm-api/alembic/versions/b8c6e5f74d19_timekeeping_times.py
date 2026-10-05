"""Timekeeping rows get `start_time` / `end_time` ("HH:mm").

The office's manual chấm công can now record giờ vào / giờ ra, with hours
computed from them. Catches `crm` up with the same two columns in the NestJS
twin (`crm-api-nest/prisma/migrations/20260908000000_zalo_timekeeping`).

Revision ID: b8c6e5f74d19
Revises: a7b5e4f63d98
Create Date: 2026-10-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8c6e5f74d19"
down_revision: str | None = "a7b5e4f63d98"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "timekeepingrecord", sa.Column("start_time", sa.String(), nullable=True)
    )
    op.add_column(
        "timekeepingrecord", sa.Column("end_time", sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("timekeepingrecord", "end_time")
    op.drop_column("timekeepingrecord", "start_time")

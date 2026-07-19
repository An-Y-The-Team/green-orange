"""projects: make dates and cost fields optional

Revision ID: a1b2c3d4e5f6
Revises: 435345c857b5
Create Date: 2026-07-19 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "435345c857b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NULLABLE_COLUMNS = {
    "start_date": sa.DateTime(),
    "end_date": sa.DateTime(),
    "contract_value": sa.Numeric(precision=10, scale=2),
    "estimated_cost": sa.Numeric(precision=10, scale=2),
}


def upgrade() -> None:
    for name, col_type in _NULLABLE_COLUMNS.items():
        op.alter_column("project", name, existing_type=col_type, nullable=True)


def downgrade() -> None:
    for name, col_type in _NULLABLE_COLUMNS.items():
        op.alter_column("project", name, existing_type=col_type, nullable=False)

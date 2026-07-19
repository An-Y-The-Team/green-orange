"""rename customer to client

Renames the `customer` table -> `client` (and its name index), plus the
`project.customer` column -> `project.client`. Mirrors the codebase-wide
customer→client rename; no data is dropped.

Revision ID: b7d2c9a4e1f8
Revises: 435345c857b5
Create Date: 2026-07-19 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7d2c9a4e1f8"
down_revision: str | None = "435345c857b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("customer", "client")
    op.execute("ALTER INDEX ix_customer_name RENAME TO ix_client_name")
    op.alter_column("project", "customer", new_column_name="client")


def downgrade() -> None:
    op.alter_column("project", "client", new_column_name="customer")
    op.execute("ALTER INDEX ix_client_name RENAME TO ix_customer_name")
    op.rename_table("client", "customer")

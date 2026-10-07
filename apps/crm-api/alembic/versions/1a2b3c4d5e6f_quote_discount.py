"""Quote gets a giảm giá trước thuế; grand_total is recomputed over the net.

Catches `crm` up with the NestJS twin
(`crm-api-nest/prisma/migrations/20261007000000_quote_discount`). The Excel
Bảng báo giá prints Σ items → "Giảm giá trước thuế" → VAT on the net, and a
quote imported from it must total the same.

A generated column's expression cannot be altered in place, so grand_total is
dropped and re-added. Existing rows get discount 0: every stored total is
unchanged.

Revision ID: 1a2b3c4d5e6f
Revises: c9d7f6a85e2a
Create Date: 2026-10-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1a2b3c4d5e6f"
down_revision: str | None = "c9d7f6a85e2a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Kept in lock-step with app/models/quote.py GRAND_TOTAL_SQL.
GRAND_TOTAL_SQL = (
    "CAST((total_amount - discount_amount)"
    " + round(CAST((total_amount - discount_amount) * vat_rate AS NUMERIC))"
    " AS BIGINT)"
)
# The e5f3c2d41b76 expression, for downgrade.
OLD_GRAND_TOTAL_SQL = (
    "CAST(total_amount + round(CAST(total_amount * vat_rate AS NUMERIC)) AS BIGINT)"
)


def _grand_total(sql: str) -> sa.Column:
    return sa.Column(
        "grand_total", sa.BigInteger(), sa.Computed(sql, persisted=True), nullable=False
    )


def upgrade() -> None:
    op.add_column(
        "quote",
        sa.Column(
            "discount_amount", sa.BigInteger(), nullable=False, server_default="0"
        ),
    )
    op.drop_column("quote", "grand_total")
    op.add_column("quote", _grand_total(GRAND_TOTAL_SQL))


def downgrade() -> None:
    op.drop_column("quote", "grand_total")
    op.add_column("quote", _grand_total(OLD_GRAND_TOTAL_SQL))
    op.drop_column("quote", "discount_amount")

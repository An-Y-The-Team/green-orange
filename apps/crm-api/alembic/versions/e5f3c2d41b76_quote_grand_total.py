"""Quote gets an after-VAT `grand_total` generated column.

Catches `crm` up with the NestJS twin
(`crm-api-nest/prisma/migrations/20260912000000_quote_grand_total`). A
behaviour in only one backend is a bug — crm-web is pointed at either by one env
var, and `GET /quotes?sort_by=grand_total` must page identically on both.

Σ items + VAT, STORED so ORDER BY can use it. Ties round half up, in NUMERIC:
`round(double precision)` rounds ties to even in Postgres, which would leave the
stored figure one đồng below what every screen prints via `Math.round`.

Revision ID: e5f3c2d41b76
Revises: d4e2b1c39a05
Create Date: 2026-09-10
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f3c2d41b76"
down_revision: str | None = "d4e2b1c39a05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Kept in lock-step with app/models/quote.py.
GRAND_TOTAL_SQL = (
    "CAST(total_amount + round(CAST(total_amount * vat_rate AS NUMERIC)) AS BIGINT)"
)


def upgrade() -> None:
    op.add_column(
        "quote",
        sa.Column(
            "grand_total",
            sa.BigInteger(),
            sa.Computed(GRAND_TOTAL_SQL, persisted=True),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("quote", "grand_total")

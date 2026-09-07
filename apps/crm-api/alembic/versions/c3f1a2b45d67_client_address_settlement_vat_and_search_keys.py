"""Client address, quyết toán VAT/giảm giá, and the diacritic search keys.

Catches `crm` up with the three schema changes the NestJS backend made after the
v2 port (`crm-api-nest/prisma/migrations/20260816000000_client_address`,
`…_settlement_vat_and_discount`, `…_unaccent_search`). A behaviour in only one
backend is a bug — crm-web is pointed at either by one env var.

The search keys differ from the Nest twin in HOW they are maintained: there they
are Postgres GENERATED columns, because two writers share `crm_nest`; here they
are plain columns written by the mapper events in app/models/__init__.py, so the
backfill below is the same `normalize_search` the app will use from now on and
this database needs no `unaccent` extension. The trigram index is not optional
dressing: the predicate is LIKE '%…%', which no btree can serve.

Revision ID: c3f1a2b45d67
Revises: 84d98b061466
Create Date: 2026-09-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.core.search import normalize_search

# revision identifiers, used by Alembic.
revision: str = "c3f1a2b45d67"
down_revision: str | None = "84d98b061466"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The three names a user searches for. Codes, tax codes and phone numbers are
# deliberately left alone: they are ASCII, so lower() already matches.
SEARCHABLE = ("client", "project", "crewmember")


def upgrade() -> None:
    # Bên A's registered address, for the contract party block. Nullable:
    # existing clients have none, and only individuals are required to supply
    # one (the route enforces that, as it already did for their default
    # location).
    op.add_column("client", sa.Column("address", sa.String(), nullable=True))

    # The quyết toán needs the same money shape as the báo giá it settles: a
    # giảm giá trước thuế and a VAT rate. Without them Bill.total_amount was the
    # pre-VAT subtotal while the contract stated the VAT-inclusive figure, so
    # every đề nghị thanh toán under-asked by the tax. The defaults apply to
    # existing rows too — nothing already signed is restated, because the
    # sandbox database is seeded, not owned.
    op.add_column(
        "settlement",
        sa.Column(
            "discount_amount", sa.BigInteger(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "settlement",
        sa.Column("vat_rate", sa.Float(), nullable=False, server_default="0.08"),
    )

    bind = op.get_bind()
    for table in SEARCHABLE:
        op.add_column(table, sa.Column("name_norm", sa.String(), nullable=True))
        # Backfill in Python, with the very function the app writes with: a SQL
        # `unaccent()` would need an extension and could still disagree with it.
        rows = bind.execute(
            sa.text(f'SELECT id, name FROM "{table}"')  # noqa: S608 — fixed list
        ).all()
        for row_id, name in rows:
            bind.execute(
                sa.text(f'UPDATE "{table}" SET name_norm = :norm WHERE id = :id'),  # noqa: S608
                {"norm": normalize_search(name), "id": row_id},
            )

    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        for table in SEARCHABLE:
            op.create_index(
                f"ix_{table}_name_norm_trgm",
                table,
                ["name_norm"],
                postgresql_using="gin",
                postgresql_ops={"name_norm": "gin_trgm_ops"},
            )


def downgrade() -> None:
    bind = op.get_bind()
    for table in SEARCHABLE:
        if bind.dialect.name == "postgresql":
            op.drop_index(f"ix_{table}_name_norm_trgm", table_name=table)
        op.drop_column(table, "name_norm")
    op.drop_column("settlement", "vat_rate")
    op.drop_column("settlement", "discount_amount")
    op.drop_column("client", "address")

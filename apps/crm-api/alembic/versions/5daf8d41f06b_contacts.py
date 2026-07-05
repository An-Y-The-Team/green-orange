"""contacts

Revision ID: 5daf8d41f06b
Revises: 27167724b317
Create Date: 2026-07-01 12:20:54.359274
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5daf8d41f06b"
down_revision: str | None = "27167724b317"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "contact" not in inspector.get_table_names():
        op.create_table(
            "contact",
            sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("company", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("id", sa.Integer(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    existing_indexes = {index["name"] for index in inspector.get_indexes("contact")}
    if op.f("ix_contact_name") not in existing_indexes:
        op.create_index(op.f("ix_contact_name"), "contact", ["name"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if op.f("ix_contact_name") in {
        index["name"] for index in inspector.get_indexes("contact")
    }:
        op.drop_index(op.f("ix_contact_name"), table_name="contact")

    if "contact" in inspector.get_table_names():
        op.drop_table("contact")

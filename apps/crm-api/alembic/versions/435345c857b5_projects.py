"""projects

Revision ID: 435345c857b5
Revises: 5daf8d41f06b
Create Date: 2026-07-05 09:18:33.391903
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "435345c857b5"
down_revision: str | None = "5daf8d41f06b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "project" not in inspector.get_table_names():
        op.create_table(
            "project",
            sa.Column("code", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
            sa.Column("customer", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("address", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("stage", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column(
                "schedule_outcome",
                sqlmodel.sql.sqltypes.AutoString(),
                nullable=True,
            ),
            sa.Column("start_date", sa.DateTime(), nullable=False),
            sa.Column("end_date", sa.DateTime(), nullable=False),
            sa.Column("manager", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("contract_value", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("estimated_cost", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("progress", sa.Integer(), nullable=False),
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    existing_indexes = {index["name"] for index in inspector.get_indexes("project")}
    if op.f("ix_project_code") not in existing_indexes:
        op.create_index(op.f("ix_project_code"), "project", ["code"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_indexes = {index["name"] for index in inspector.get_indexes("project")}
    if op.f("ix_project_code") in existing_indexes:
        op.drop_index(op.f("ix_project_code"), table_name="project")

    if "project" in inspector.get_table_names():
        op.drop_table("project")

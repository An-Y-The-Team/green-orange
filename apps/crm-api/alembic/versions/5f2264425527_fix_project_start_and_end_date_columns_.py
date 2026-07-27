"""fix project start and end date columns to date

Revision ID: 5f2264425527
Revises: b909842f69b4
Create Date: 2026-07-25 11:04:47.528560
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5f2264425527'
down_revision: str | None = 'b909842f69b4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # `project.start_date` / `end_date` were created as TIMESTAMP WITHOUT TIME
    # ZONE by 435345c857b5, but the SQLModel declares them as `date`. Pydantic
    # (the response_model serializer) refuses to lossily coerce a `datetime`
    # that carries a non-zero time-of-day to `date`
    # (`date_from_datetime_inexact`), so GET /projects returned 500 for any row
    # inserted with a time component. Cast the columns to `date`, dropping the
    # time portion, so the column type matches the model.
    op.alter_column(
        "project",
        "start_date",
        existing_type=sa.DateTime(),
        type_=sa.Date(),
        existing_nullable=False,
        postgresql_using="start_date::date",
    )
    op.alter_column(
        "project",
        "end_date",
        existing_type=sa.DateTime(),
        type_=sa.Date(),
        existing_nullable=False,
        postgresql_using="end_date::date",
    )


def downgrade() -> None:
    # Restore the original TIMESTAMP WITHOUT TIME ZONE type. Casting a date back
    # to a timestamp is lossless (it lands on midnight).
    op.alter_column(
        "project",
        "end_date",
        existing_type=sa.Date(),
        type_=sa.DateTime(),
        existing_nullable=False,
        postgresql_using="end_date::timestamp",
    )
    op.alter_column(
        "project",
        "start_date",
        existing_type=sa.Date(),
        type_=sa.DateTime(),
        existing_nullable=False,
        postgresql_using="start_date::timestamp",
    )
"""v2_greenorange_flow — the whole GreenOrange schema.

Replaces the v1 CRM tables (client / contact / project, whose columns and
relationships bear no resemblance to v2) with the 23 tables of
`apps/crm-api-nest/prisma/schema.prisma`. `user` is carried over untouched — the
auth tables are identical in both versions, so the admin login survives.

Data is NOT migrated: v1 linked rows by name strings where v2 uses foreign keys,
and the sandbox database is seeded, not owned (`uv run python -m app.seed`). For
the same reason the downgrade only drops the v2 tables — the cutover is one-way,
matching the NestJS side, which has no down migrations at all.

Revision ID: 84d98b061466
Revises: b7d2c9a4e1f8
Create Date: 2026-08-17 14:01:52.919760
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "84d98b061466"
down_revision: str | None = "b7d2c9a4e1f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # v1 tables, dropped rather than altered: `project.client` was a name
    # string, not a client_id. IF EXISTS so a re-run after a downgrade works.
    op.execute("DROP TABLE IF EXISTS project")
    op.execute("DROP TABLE IF EXISTS contact")
    op.execute("DROP TABLE IF EXISTS client")

    op.create_table(
        "client",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("tax_code", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "companyprofile",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("tagline", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("address", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("tax_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("website", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("representative", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "representative_title", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
        sa.Column("bank_account", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("bank_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("bank_branch", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("letterhead_body", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("national_body", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("logo", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "contracttemplate",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("doc_title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("body", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("show_letterhead", sa.Boolean(), nullable=False),
        sa.Column("show_national", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "crewrole",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "projecttype",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    # `user` already exists from the v1 initial migration — left as is.
    op.create_table(
        "contact",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["client.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contact_client_id"), "contact", ["client_id"], unique=False
    )
    op.create_table(
        "crewmember",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "employment_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False
        ),
        sa.Column("default_role_id", sa.Integer(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["default_role_id"],
            ["crewrole.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_crewmember_default_role_id"),
        "crewmember",
        ["default_role_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_crewmember_employment_type"),
        "crewmember",
        ["employment_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_crewmember_status"), "crewmember", ["status"], unique=False
    )
    op.create_table(
        "location",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("address", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("manager_contact_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["client.id"],
        ),
        sa.ForeignKeyConstraint(
            ["manager_contact_id"],
            ["contact.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_location_client_id"), "location", ["client_id"], unique=False
    )
    op.create_index(
        op.f("ix_location_manager_contact_id"),
        "location",
        ["manager_contact_id"],
        unique=False,
    )
    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("working_contact_id", sa.Integer(), nullable=False),
        sa.Column("decision_maker_contact_id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("request_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("referral_source", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("stage", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("cancel_reason", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
        sa.Column("appointment_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("visit_date", sa.Date(), nullable=True),
        sa.Column("survey_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("survey_items", sa.JSON(), nullable=True),
        sa.Column("client_signed_date", sa.Date(), nullable=True),
        sa.Column(
            "execution_sub_status", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("est_duration_days", sa.Integer(), nullable=True),
        sa.Column("actual_duration_days", sa.Integer(), nullable=True),
        sa.Column("approaches", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("works_done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "acceptance_sub_status", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
        sa.Column("acceptance_passed_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["client.id"],
        ),
        sa.ForeignKeyConstraint(
            ["decision_maker_contact_id"],
            ["contact.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
        ),
        sa.ForeignKeyConstraint(
            ["working_contact_id"],
            ["contact.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(
        op.f("ix_project_client_id"), "project", ["client_id"], unique=False
    )
    op.create_index(
        op.f("ix_project_decision_maker_contact_id"),
        "project",
        ["decision_maker_contact_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_location_id"), "project", ["location_id"], unique=False
    )
    op.create_index(op.f("ix_project_stage"), "project", ["stage"], unique=False)
    op.create_index(op.f("ix_project_status"), "project", ["status"], unique=False)
    op.create_index(
        op.f("ix_project_working_contact_id"),
        "project",
        ["working_contact_id"],
        unique=False,
    )
    op.create_table(
        "assignment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("crew_member_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=True),
        sa.Column("from_date", sa.Date(), nullable=False),
        sa.Column("to_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(
            ["crew_member_id"],
            ["crewmember.id"],
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["crewrole.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assignment_crew_member_id"),
        "assignment",
        ["crew_member_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assignment_project_id"), "assignment", ["project_id"], unique=False
    )
    op.create_index(
        op.f("ix_assignment_role_id"), "assignment", ["role_id"], unique=False
    )
    op.create_table(
        "contract",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("signed_date", sa.Date(), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("body", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_a_label", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_a_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_a_title", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_b_label", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_b_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_b_title", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("print_snapshot", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["contracttemplate.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(
        op.f("ix_contract_project_id"), "contract", ["project_id"], unique=False
    )
    op.create_table(
        "paperworkitem",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_paperworkitem_project_id"),
        "paperworkitem",
        ["project_id"],
        unique=False,
    )
    op.create_table(
        "projectnote",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("tag", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("body", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_projectnote_project_id"), "projectnote", ["project_id"], unique=False
    )
    op.create_table(
        "projecttypelink",
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("project_type_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.ForeignKeyConstraint(
            ["project_type_id"],
            ["projecttype.id"],
        ),
        sa.PrimaryKeyConstraint("project_id", "project_type_id"),
    )
    op.create_table(
        "quote",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("total_amount", sa.BigInteger(), nullable=False),
        sa.Column("vat_rate", sa.Float(), nullable=False),
        sa.Column("decided_date", sa.Date(), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("rep_title", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "version"),
    )
    op.create_index(op.f("ix_quote_status"), "quote", ["status"], unique=False)
    op.create_table(
        "settlement",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("total_amount", sa.BigInteger(), nullable=False),
        sa.Column("signed_date", sa.Date(), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id"),
    )
    op.create_table(
        "timekeepingrecord",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("crew_member_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["crew_member_id"],
            ["crewmember.id"],
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("crew_member_id", "project_id", "work_date", "source"),
    )
    op.create_index(
        op.f("ix_timekeepingrecord_crew_member_id"),
        "timekeepingrecord",
        ["crew_member_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_timekeepingrecord_project_id"),
        "timekeepingrecord",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_timekeepingrecord_work_date"),
        "timekeepingrecord",
        ["work_date"],
        unique=False,
    )
    op.create_table(
        "attachment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("kind", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("paperwork_item_id", sa.Integer(), nullable=True),
        sa.Column("s3_key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["paperwork_item_id"],
            ["paperworkitem.id"],
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_attachment_paperwork_item_id"),
        "attachment",
        ["paperwork_item_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attachment_project_id"), "attachment", ["project_id"], unique=False
    )
    op.create_table(
        "bill",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("settlement_id", sa.Integer(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("total_amount", sa.BigInteger(), nullable=False),
        sa.Column("sent_date", sa.Date(), nullable=True),
        sa.Column("paid_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.ForeignKeyConstraint(
            ["settlement_id"],
            ["settlement.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("settlement_id"),
    )
    op.create_index(op.f("ix_bill_project_id"), "bill", ["project_id"], unique=False)
    op.create_table(
        "quoteitem",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote_id", sa.Integer(), nullable=False),
        sa.Column("category", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("unit", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.BigInteger(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quote.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_quoteitem_quote_id"), "quoteitem", ["quote_id"], unique=False
    )
    op.create_table(
        "quotesendlog",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote_id", sa.Integer(), nullable=False),
        sa.Column("channel", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("sent_by", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("follow_up_ref", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quote.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_quotesendlog_quote_id"), "quotesendlog", ["quote_id"], unique=False
    )
    op.create_table(
        "settlementitem",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("settlement_id", sa.Integer(), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("unit", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.BigInteger(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["settlement_id"], ["settlement.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_settlementitem_settlement_id"),
        "settlementitem",
        ["settlement_id"],
        unique=False,
    )
    op.create_table(
        "paymentmilestone",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("bill_id", sa.Integer(), nullable=True),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("paid_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(
            ["bill_id"],
            ["bill.id"],
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_paymentmilestone_bill_id"),
        "paymentmilestone",
        ["bill_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_paymentmilestone_project_id"),
        "paymentmilestone",
        ["project_id"],
        unique=False,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_paymentmilestone_project_id"), table_name="paymentmilestone")
    op.drop_index(op.f("ix_paymentmilestone_bill_id"), table_name="paymentmilestone")
    op.drop_table("paymentmilestone")
    op.drop_index(op.f("ix_settlementitem_settlement_id"), table_name="settlementitem")
    op.drop_table("settlementitem")
    op.drop_index(op.f("ix_quotesendlog_quote_id"), table_name="quotesendlog")
    op.drop_table("quotesendlog")
    op.drop_index(op.f("ix_quoteitem_quote_id"), table_name="quoteitem")
    op.drop_table("quoteitem")
    op.drop_index(op.f("ix_bill_project_id"), table_name="bill")
    op.drop_table("bill")
    op.drop_index(op.f("ix_attachment_project_id"), table_name="attachment")
    op.drop_index(op.f("ix_attachment_paperwork_item_id"), table_name="attachment")
    op.drop_table("attachment")
    op.drop_index(
        op.f("ix_timekeepingrecord_work_date"), table_name="timekeepingrecord"
    )
    op.drop_index(
        op.f("ix_timekeepingrecord_project_id"), table_name="timekeepingrecord"
    )
    op.drop_index(
        op.f("ix_timekeepingrecord_crew_member_id"), table_name="timekeepingrecord"
    )
    op.drop_table("timekeepingrecord")
    op.drop_table("settlement")
    op.drop_index(op.f("ix_quote_status"), table_name="quote")
    op.drop_table("quote")
    op.drop_table("projecttypelink")
    op.drop_index(op.f("ix_projectnote_project_id"), table_name="projectnote")
    op.drop_table("projectnote")
    op.drop_index(op.f("ix_paperworkitem_project_id"), table_name="paperworkitem")
    op.drop_table("paperworkitem")
    op.drop_index(op.f("ix_contract_project_id"), table_name="contract")
    op.drop_table("contract")
    op.drop_index(op.f("ix_assignment_role_id"), table_name="assignment")
    op.drop_index(op.f("ix_assignment_project_id"), table_name="assignment")
    op.drop_index(op.f("ix_assignment_crew_member_id"), table_name="assignment")
    op.drop_table("assignment")
    op.drop_index(op.f("ix_project_working_contact_id"), table_name="project")
    op.drop_index(op.f("ix_project_status"), table_name="project")
    op.drop_index(op.f("ix_project_stage"), table_name="project")
    op.drop_index(op.f("ix_project_location_id"), table_name="project")
    op.drop_index(op.f("ix_project_decision_maker_contact_id"), table_name="project")
    op.drop_index(op.f("ix_project_client_id"), table_name="project")
    op.drop_table("project")
    op.drop_index(op.f("ix_location_manager_contact_id"), table_name="location")
    op.drop_index(op.f("ix_location_client_id"), table_name="location")
    op.drop_table("location")
    op.drop_index(op.f("ix_crewmember_status"), table_name="crewmember")
    op.drop_index(op.f("ix_crewmember_employment_type"), table_name="crewmember")
    op.drop_index(op.f("ix_crewmember_default_role_id"), table_name="crewmember")
    op.drop_table("crewmember")
    op.drop_index(op.f("ix_contact_client_id"), table_name="contact")
    op.drop_table("contact")
    op.drop_table("projecttype")
    op.drop_table("crewrole")
    op.drop_table("contracttemplate")
    op.drop_table("companyprofile")
    op.drop_table("client")
    # ### end Alembic commands ###

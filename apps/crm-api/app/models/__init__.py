"""Importing this package registers every table model on SQLModel.metadata.

The v2 GreenOrange schema, kept in lockstep with the NestJS backend's
`crm-api-nest/prisma/schema.prisma`. Import order matters only in that a module
must come after the ones it imports; SQLAlchemy resolves the relationships
themselves by class name once everything is loaded.
"""

from sqlalchemy import event

from app.core.search import normalize_search
from app.models.client import Client, Contact, Location
from app.models.contract import CompanyProfile, Contract, ContractTemplate
from app.models.crew import Assignment, CrewMember, CrewRole, TimekeepingRecord
from app.models.paperwork import PaperworkItem
from app.models.project import (
    Attachment,
    Project,
    ProjectNote,
    ProjectType,
    ProjectTypeLink,
)
from app.models.quote import Quote, QuoteItem, QuoteSendLog
from app.models.receivable import Bill, PaymentMilestone, Settlement, SettlementItem
from app.models.user import User


def _sync_name_norm(_mapper, _connection, target) -> None:
    """Keep `name_norm` = lower(unaccent(name)) on every write.

    Here rather than in the routes because a search key that four handlers
    remember to set is a search key that goes stale the first time a fifth one
    is added. The NestJS twin gets this from a Postgres GENERATED column
    (migration 20260907000000_unaccent_search); SQLite cannot express one, and
    this database has a single writer, so an ORM event is the equivalent.
    """
    target.name_norm = normalize_search(target.name)


for _searchable in (Client, Project, CrewMember):
    event.listen(_searchable, "before_insert", _sync_name_norm)
    event.listen(_searchable, "before_update", _sync_name_norm)


__all__ = [
    "Assignment",
    "Attachment",
    "Bill",
    "Client",
    "CompanyProfile",
    "Contact",
    "Contract",
    "ContractTemplate",
    "CrewMember",
    "CrewRole",
    "Location",
    "PaperworkItem",
    "PaymentMilestone",
    "Project",
    "ProjectNote",
    "ProjectType",
    "ProjectTypeLink",
    "Quote",
    "QuoteItem",
    "QuoteSendLog",
    "Settlement",
    "SettlementItem",
    "TimekeepingRecord",
    "User",
]

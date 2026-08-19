"""Importing this package registers every table model on SQLModel.metadata.

The v2 GreenOrange schema, kept in lockstep with the NestJS backend's
`crm-api-nest/prisma/schema.prisma`. Import order matters only in that a module
must come after the ones it imports; SQLAlchemy resolves the relationships
themselves by class name once everything is loaded.
"""

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

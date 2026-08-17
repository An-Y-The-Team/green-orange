"""Seed the demo dataset: `uv run python -m app.seed`.

Idempotent — every block is skipped when its table already holds rows, so a
second run converges instead of duplicating. The demo login is admin / admin
(local auth); change it before any real deployment.

Reference data (project types, crew roles, the contract template) matches
`crm-api-nest/src/seed.ts` so the two backends drive the same pickers. The demo
công trình here are a smaller set than the Nest seed's one-per-stage fixture:
enough for every page to render, not a full lifecycle museum.
"""

from datetime import timedelta

from sqlmodel import Session, select

from app.core.db import engine
from app.core.rules import business_today
from app.core.security import hash_password
from app.models.client import Client, Contact, Location
from app.models.contract import ContractTemplate
from app.models.crew import CrewMember, CrewRole
from app.models.paperwork import DEFAULT_PAPERWORK, PaperworkItem
from app.models.project import Project, ProjectType
from app.models.quote import Quote, QuoteItem
from app.models.receivable import PaymentMilestone
from app.models.user import User

PROJECT_TYPES = ("Vệ sinh", "Thi công", "Tháo dỡ")
CREW_ROLES = ("Thợ chính", "Thợ phụ", "Nhân viên vệ sinh", "Giám sát", "Lái xe")

# A minimal Lexical editorState (what the contract editor stores): one paragraph
# of plain text. crm-web renders it; the backend treats it as opaque.
_TEMPLATE_BODY = (
    '{"root":{"type":"root","version":1,"direction":"ltr","format":"","indent":0,'
    '"children":[{"type":"paragraph","version":1,"direction":"ltr","format":"",'
    '"indent":0,"children":[{"type":"text","version":1,"detail":0,"format":0,'
    '"mode":"normal","style":"","text":"Hai bên thống nhất ký kết hợp đồng thi '
    'công với các điều khoản dưới đây."}]}]}}'
)


def _empty(session: Session, model: type) -> bool:
    return session.exec(select(model)).first() is None


def seed_initial_data() -> None:
    today = business_today()
    with Session(engine) as session:
        if not session.exec(select(User).where(User.username == "admin")).first():
            session.add(
                User(
                    username="admin",
                    hashed_password=hash_password("admin"),
                    full_name="Demo Admin",
                )
            )
        if _empty(session, ProjectType):
            for name in PROJECT_TYPES:
                session.add(ProjectType(name=name))
        if _empty(session, CrewRole):
            for name in CREW_ROLES:
                session.add(CrewRole(name=name))
        if _empty(session, ContractTemplate):
            session.add(
                ContractTemplate(
                    name="Hợp đồng thi công",
                    doc_title="HỢP ĐỒNG THI CÔNG",
                    body=_TEMPLATE_BODY,
                )
            )
        session.commit()

        if _empty(session, CrewMember):
            supervisor = session.exec(
                select(CrewRole).where(CrewRole.name == "Giám sát")
            ).one()
            worker = session.exec(
                select(CrewRole).where(CrewRole.name == "Thợ chính")
            ).one()
            session.add(
                CrewMember(
                    name="Phạm Văn Dũng",
                    phone="+84 90 111 2233",
                    employment_type="permanent",
                    default_role_id=supervisor.id,
                )
            )
            session.add(
                CrewMember(
                    name="Ngô Minh Hải",
                    phone="+84 93 444 5566",
                    employment_type="day_hire",
                    default_role_id=worker.id,
                )
            )
            session.commit()

        if not _empty(session, Client):
            return  # demo công trình already seeded

        # Two clients: a company (contacts + site) and an individual (their own
        # contact plus a default location), the two shapes POST /clients builds.
        acme = Client(
            name="Công ty TNHH Acme",
            type="company",
            tax_code="0312345678",
            email="ketoan@acme.vn",
        )
        binh = Client(name="Trần Thị Bình", type="individual")
        session.add_all([acme, binh])
        session.commit()

        acme_contact = Contact(
            client_id=acme.id,
            name="Nguyễn Văn An",
            phone="+84 90 123 4567",
            email="an.nguyen@acme.vn",
            title="Trưởng phòng hành chính",
        )
        binh_contact = Contact(
            client_id=binh.id, name="Trần Thị Bình", phone="+84 91 234 5678"
        )
        session.add_all([acme_contact, binh_contact])
        session.commit()

        acme_site = Location(
            client_id=acme.id,
            name="Nhà máy Bình Dương",
            address="Lô 12, KCN Mỹ Phước 3, Bình Dương",
            manager_contact_id=acme_contact.id,
        )
        binh_site = Location(
            client_id=binh.id,
            name="Mặc định",
            address="45 Nguyễn Trãi, Quận 5, TP.HCM",
            manager_contact_id=binh_contact.id,
        )
        session.add_all([acme_site, binh_site])
        session.commit()

        types = {t.name: t for t in session.exec(select(ProjectType)).all()}

        # Stage 1: an appointment today — the field page's whole reason to exist.
        request_project = Project(
            code="CT-2026-001",
            name="Vệ sinh nhà máy Bình Dương",
            client_id=acme.id,
            location_id=acme_site.id,
            working_contact_id=acme_contact.id,
            decision_maker_contact_id=acme_contact.id,
            stage="request",
            request_note="Khách cần vệ sinh toàn bộ xưởng sau khi lắp máy.",
            referral_source="Khách cũ giới thiệu",
            appointment_at=None,
            types=[types["Vệ sinh"]],
        )
        # Stage 2: a quote out and waiting for the client's answer.
        quote_project = Project(
            code="CT-2026-002",
            name="Tháo dỡ vách ngăn tầng 3",
            client_id=binh.id,
            location_id=binh_site.id,
            working_contact_id=binh_contact.id,
            decision_maker_contact_id=binh_contact.id,
            stage="quote",
            visit_date=today - timedelta(days=3),
            survey_note="Vách thạch cao, khoảng 40 m².",
            types=[types["Tháo dỡ"]],
        )
        # Stage 5: cọc received, paperwork in preparation.
        paperwork_project = Project(
            code="CT-2026-003",
            name="Thi công sàn epoxy kho A",
            client_id=acme.id,
            location_id=acme_site.id,
            working_contact_id=acme_contact.id,
            decision_maker_contact_id=acme_contact.id,
            stage="paperwork",
            start_date=today + timedelta(days=7),
            est_duration_days=10,
            types=[types["Thi công"]],
        )
        session.add_all([request_project, quote_project, paperwork_project])
        session.commit()

        for project in (request_project, quote_project, paperwork_project):
            for name in DEFAULT_PAPERWORK:
                session.add(PaperworkItem(project_id=project.id, name=name))

        session.add(
            Quote(
                project_id=quote_project.id,
                version=1,
                status="waiting",
                total_amount=18_000_000,
                items=[
                    QuoteItem(
                        category="A. PHẦN THÁO DỠ",
                        description="Tháo dỡ vách thạch cao",
                        unit="m²",
                        quantity=40,
                        unit_price=300_000,
                        amount=12_000_000,
                        sort_order=0,
                    ),
                    QuoteItem(
                        category="A. PHẦN THÁO DỠ",
                        description="Vận chuyển phế thải",
                        unit="chuyến",
                        quantity=3,
                        unit_price=2_000_000,
                        amount=6_000_000,
                        sort_order=1,
                    ),
                ],
            )
        )
        # The cọc that carried CT-2026-003 out of stage 4.
        session.add(
            PaymentMilestone(
                project_id=paperwork_project.id,
                type="deposit",
                amount=30_000_000,
                status="paid",
                paid_date=today - timedelta(days=2),
            )
        )
        session.commit()


if __name__ == "__main__":
    seed_initial_data()
    print("seeded")

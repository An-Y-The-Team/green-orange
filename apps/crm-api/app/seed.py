"""Seed a demo user and a few clients so the worked example runs out of the box.

Idempotent: only inserts when the respective table is empty. The demo login is
admin / admin (local auth) — change it before any real deployment.
"""

from sqlmodel import Session, select

from app.core.db import engine
from app.core.security import hash_password
from app.models.client import Client
from app.models.user import User

_DEMO_CLIENTS = [
    {
        "name": "Nguyễn Văn An",
        "email": "an.nguyen@acme.vn",
        "phone": "+84 90 123 4567",
        "company": "Acme Corp",
        "status": "active",
    },
    {
        "name": "Trần Thị Bình",
        "email": "binh.tran@globex.vn",
        "phone": "+84 91 234 5678",
        "company": "Globex",
        "status": "active",
    },
    {
        "name": "Lê Hoàng Cường",
        "email": "cuong.le@initech.vn",
        "phone": "+84 92 345 6789",
        "company": "Initech",
        "status": "lead",
    },
]


def seed_initial_data() -> None:
    with Session(engine) as session:
        if not session.exec(select(User)).first():
            session.add(
                User(
                    username="admin",
                    hashed_password=hash_password("admin"),
                    full_name="Demo Admin",
                )
            )
        if not session.exec(select(Client)).first():
            for data in _DEMO_CLIENTS:
                session.add(Client(**data))
        session.commit()

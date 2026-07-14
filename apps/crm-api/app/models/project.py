from __future__ import annotations

import decimal
from datetime import datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel


class ProjectType(StrEnum):
    VE_SINH = "ve_sinh"
    THI_CONG = "thi_cong"


class ProjectStage(StrEnum):
    YEU_CAU = "yeu_cau"  # 1. client inquiry
    KHAO_SAT = "khao_sat"  # 2. site survey / scouting
    BAO_GIA = "bao_gia"  # 4. quotation drafted
    HOP_DONG = "hop_dong"  # 7. contract signed
    CHUAN_BI = "chuan_bi"  # 8. permits / paperwork
    THI_CONG = "thi_cong"  # 9. on-site work
    NGHIEM_THU = "nghiem_thu"  # 12. acceptance / hand-over
    QUYET_TOAN = "quyet_toan"  # 13. final settlement
    THANH_TOAN = "thanh_toan"  # 14. awaiting payment
    DONG = "dong"  # 15. contract closed


class ScheduleOutcome(StrEnum):
    ON_TIME = "on_time"
    DELAYED = "delayed"
    EARLY = "early"


class CostCategory(StrEnum):
    VAT_TU = "vat_tu"  # materials
    NHAN_CONG = "nhan_cong"  # labor
    THIET_BI = "thiet_bi"  # equipment / tools
    SU_CO = "su_co"  # incident / breakage
    KHAC = "khac"  # other / unforeseen


class AcceptanceStatus(StrEnum):
    CHO_NGHIEM_THU = "cho_nghiem_thu"
    DA_NGHIEM_THU = "da_nghiem_thu"
    CO_VAN_DE = "co_van_de"


class ProjectBase(SQLModel):
    code: str = Field(index=True)
    name: str
    description: str | None = None
    customer: str
    type: ProjectType
    address: str
    stage: ProjectStage
    schedule_outcome: ScheduleOutcome | None = None
    start_date: datetime
    end_date: datetime
    manager: str
    contract_value: decimal.Decimal
    estimated_cost: decimal.Decimal
    progress: int


class Project(ProjectBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime | None = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectPublic(ProjectBase):
    id: int


class ProjectUpdate(SQLModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    customer: str | None = None
    type: ProjectType | None = None
    address: str | None = None
    stage: ProjectStage | None = None
    schedule_outcome: ScheduleOutcome | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    manager: str | None = None
    contract_value: decimal.Decimal | None = None
    estimated_cost: decimal.Decimal | None = None
    progress: int | None = None

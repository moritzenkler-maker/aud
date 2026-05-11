from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.user import UserRead


class TemplateItemRead(BaseModel):
    id: UUID
    text: str
    category: str | None
    order: int

    model_config = {"from_attributes": True}


class AuditTemplateRead(BaseModel):
    id: UUID
    name: str
    category: str
    description: str | None
    items: list[TemplateItemRead] = []

    model_config = {"from_attributes": True}


class AuditTemplateCreate(BaseModel):
    name: str
    category: str
    description: str | None = None
    items: list[dict] = []


class ChecklistItemCreate(BaseModel):
    text: str
    category: str | None = None
    order: int = 0


class ChecklistItemUpdate(BaseModel):
    status: str | None = None  # open | ok | nok | na
    comment: str | None = None
    photo_url: str | None = None


class ChecklistItemRead(BaseModel):
    id: UUID
    text: str
    category: str | None
    status: str
    comment: str | None
    photo_url: str | None
    order: int

    model_config = {"from_attributes": True}


class AuditCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    category: str = "general"
    template_id: UUID | None = None
    assigned_to_id: UUID | None = None
    scheduled_date: datetime | None = None
    checklist_items: list[ChecklistItemCreate] = []


class AuditUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    status: str | None = None
    assigned_to_id: UUID | None = None
    scheduled_date: datetime | None = None
    completed_date: datetime | None = None


class AuditRead(BaseModel):
    id: UUID
    title: str
    description: str | None
    location: str | None
    status: str
    category: str
    created_by: UserRead
    assigned_to: UserRead | None
    scheduled_date: datetime | None
    completed_date: datetime | None
    created_at: datetime
    updated_at: datetime
    ai_summary: str | None
    checklist_items: list[ChecklistItemRead] = []

    model_config = {"from_attributes": True}


class AuditListItem(BaseModel):
    id: UUID
    title: str
    location: str | None
    status: str
    category: str
    created_by: UserRead
    assigned_to: UserRead | None
    scheduled_date: datetime | None
    completed_date: datetime | None
    created_at: datetime
    checklist_items_count: int = 0
    open_actions_count: int = 0

    model_config = {"from_attributes": True}

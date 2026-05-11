from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.user import UserRead


class ActionItemCreate(BaseModel):
    audit_id: UUID
    checklist_item_id: UUID | None = None
    title: str
    description: str | None = None
    priority: str = "medium"
    assigned_to_id: UUID | None = None
    due_date: datetime | None = None


class ActionItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to_id: UUID | None = None
    due_date: datetime | None = None


class ActionItemRead(BaseModel):
    id: UUID
    audit_id: UUID
    checklist_item_id: UUID | None
    title: str
    description: str | None
    priority: str
    status: str
    assigned_to: UserRead | None
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

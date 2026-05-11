import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False)
    checklist_item_id = Column(UUID(as_uuid=True), ForeignKey("checklist_items.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # low | medium | high | critical
    priority = Column(String, default="medium")
    # open | in_progress | done | cancelled
    status = Column(String, default="open")

    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    audit = relationship("Audit", back_populates="action_items")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="action_items")
    checklist_item = relationship("ChecklistItem")

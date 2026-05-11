import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AuditTemplate(Base):
    __tablename__ = "audit_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # safety, quality, environment, fire, etc.
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    items = relationship("TemplateItem", back_populates="template", cascade="all, delete-orphan", order_by="TemplateItem.order")
    audits = relationship("Audit", back_populates="template")


class TemplateItem(Base):
    __tablename__ = "template_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("audit_templates.id"), nullable=False)
    text = Column(String, nullable=False)
    category = Column(String, nullable=True)
    order = Column(Integer, default=0)

    template = relationship("AuditTemplate", back_populates="items")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    # draft | in_progress | completed | archived
    status = Column(String, default="draft")
    # safety | quality | environment | fire | general
    category = Column(String, default="general")

    template_id = Column(UUID(as_uuid=True), ForeignKey("audit_templates.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    completed_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ai_summary = Column(Text, nullable=True)

    template = relationship("AuditTemplate", back_populates="audits")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="audits_created")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_audits")
    checklist_items = relationship("ChecklistItem", back_populates="audit", cascade="all, delete-orphan", order_by="ChecklistItem.order")
    action_items = relationship("ActionItem", back_populates="audit", cascade="all, delete-orphan")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False)
    text = Column(String, nullable=False)
    category = Column(String, nullable=True)
    # open | ok | nok | na
    status = Column(String, default="open")
    comment = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    order = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    audit = relationship("Audit", back_populates="checklist_items")

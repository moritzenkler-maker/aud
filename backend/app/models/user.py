import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    company = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="auditor")  # admin, auditor, viewer
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    audits_created = relationship("Audit", foreign_keys="Audit.created_by_id", back_populates="created_by")
    assigned_audits = relationship("Audit", foreign_keys="Audit.assigned_to_id", back_populates="assigned_to")
    action_items = relationship("ActionItem", foreign_keys="ActionItem.assigned_to_id", back_populates="assigned_to")

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, func, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import AuditAction

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(SQLEnum(AuditAction), nullable=False)
    entity_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "slide", "exam"
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # Stores old/new values, IP, agent
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

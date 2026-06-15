import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, func, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import RegionType, RegionContentType

class Region(Base):
    __tablename__ = "regions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slide_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("slides.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    region_type: Mapped[RegionType] = mapped_column(SQLEnum(RegionType), nullable=False)
    geometry: Mapped[dict] = mapped_column(JSONB, nullable=False)  # Stores coordinates, radius, SVG path, etc. in %
    content_type: Mapped[Optional[RegionContentType]] = mapped_column(SQLEnum(RegionContentType), nullable=True)
    content_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # Holds questions, URLs, paths, etc.
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    slide: Mapped["Slide"] = relationship("Slide", back_populates="regions")
    creator: Mapped[Optional["User"]] = relationship("User")

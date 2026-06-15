import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class SlideViewLog(Base):
    __tablename__ = "slide_view_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slide_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("slides.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    zoom_levels_used: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # List/dict of zoom level engagement
    regions_viewed: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)    # Coordinates student focused on

    # Relationships
    slide: Mapped["Slide"] = relationship("Slide", back_populates="slide_view_logs")
    user: Mapped["User"] = relationship("User", back_populates="slide_view_logs")

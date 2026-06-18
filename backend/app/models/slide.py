import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Integer, Float, Boolean, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Slide(Base):
    __tablename__ = "slides"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    dzi_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mpp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    objective_power: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    course: Mapped["Course"] = relationship("Course", back_populates="slides")
    uploader: Mapped[Optional["User"]] = relationship("User", back_populates="slides")
    regions: Mapped[List["Region"]] = relationship("Region", back_populates="slide", cascade="all, delete-orphan")
    annotations: Mapped[List["Annotation"]] = relationship("Annotation", back_populates="slide", cascade="all, delete-orphan")
    exam_questions: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="slide")
    slide_view_logs: Mapped[List["SlideViewLog"]] = relationship("SlideViewLog", back_populates="slide", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("course_id", "content_sha256", name="uq_slides_course_content_sha256"),
    )

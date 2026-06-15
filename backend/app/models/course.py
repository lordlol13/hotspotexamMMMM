import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, ForeignKey, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.group import course_groups

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_students: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="courses")
    groups: Mapped[List["Group"]] = relationship(
        "Group",
        secondary=course_groups,
        back_populates="courses"
    )
    enrollments: Mapped[List["CourseEnrollment"]] = relationship(
        "CourseEnrollment", 
        back_populates="course", 
        cascade="all, delete-orphan"
    )
    slides: Mapped[List["Slide"]] = relationship(
        "Slide", 
        back_populates="course", 
        cascade="all, delete-orphan"
    )
    exams: Mapped[List["Exam"]] = relationship(
        "Exam", 
        back_populates="course", 
        cascade="all, delete-orphan"
    )

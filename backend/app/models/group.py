import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, DateTime, func, Column, Table, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

course_groups = Table(
    "course_groups",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("course_id", ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True)
)

exam_groups = Table(
    "exam_groups",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("exam_id", ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True)
)

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    students: Mapped[List["Student"]] = relationship("Student", back_populates="group")
    courses: Mapped[List["Course"]] = relationship(
        "Course",
        secondary=course_groups,
        back_populates="groups"
    )
    exams: Mapped[List["Exam"]] = relationship(
        "Exam",
        secondary=exam_groups,
        back_populates="groups"
    )

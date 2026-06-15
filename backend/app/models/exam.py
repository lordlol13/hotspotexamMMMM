import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Integer, Float, Boolean, DateTime, func, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.group import exam_groups

exam_students = Table(
    "exam_students",
    Base.metadata,
    Column("student_id", ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
    Column("exam_id", ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True)
)

class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    passing_score: Mapped[float] = mapped_column(Float, default=60.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    attempt_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    course: Mapped["Course"] = relationship("Course", back_populates="exams")
    creator: Mapped[Optional["User"]] = relationship("User")
    groups: Mapped[List["Group"]] = relationship(
        "Group",
        secondary=exam_groups,
        back_populates="exams"
    )
    students: Mapped[List["Student"]] = relationship(
        "Student",
        secondary=exam_students,
        back_populates="exams"
    )
    questions: Mapped[List["ExamQuestion"]] = relationship(
        "ExamQuestion",
        back_populates="exam",
        cascade="all, delete-orphan"
    )
    attempts: Mapped[List["ExamAttempt"]] = relationship(
        "ExamAttempt",
        back_populates="exam",
        cascade="all, delete-orphan"
    )
    retakes: Mapped[List["ExamRetake"]] = relationship(
        "ExamRetake",
        back_populates="exam",
        cascade="all, delete-orphan"
    )

    @property
    def group_ids(self) -> List[uuid.UUID]:
        return [g.id for g in self.groups]

    @property
    def student_ids(self) -> List[uuid.UUID]:
        return [s.id for s in self.students]

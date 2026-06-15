import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import ForeignKey, DateTime, Float, Boolean, Integer, String, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_graded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="attempts")
    student: Mapped["Student"] = relationship("Student", back_populates="exam_attempts")
    answers: Mapped[List["AttemptAnswer"]] = relationship(
        "AttemptAnswer", 
        back_populates="attempt", 
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "attempt_number", name="uq_exam_student_attempt"),
    )


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_questions.id", ondelete="RESTRICT"), nullable=False)
    selected_option_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True)
    text_answer: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    annotation_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # Stores student annotations/coords
    points_awarded: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    @property
    def selected_option_ids(self) -> Optional[List[uuid.UUID]]:
        if self.annotation_data and "selected_option_ids" in self.annotation_data:
            return [uuid.UUID(x) for x in self.annotation_data["selected_option_ids"]]
        return None

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    attempt: Mapped["ExamAttempt"] = relationship("ExamAttempt", back_populates="answers")
    question: Mapped["ExamQuestion"] = relationship("ExamQuestion", back_populates="answers")
    selected_option: Mapped[Optional["QuestionOption"]] = relationship("QuestionOption", back_populates="answers_selected")

    @property
    def explanation(self) -> Optional[str]:
        if self.question and self.question.region_of_interest:
            return self.question.region_of_interest.get("explanation")
        return None

    @property
    def explanation_image(self) -> Optional[str]:
        if self.question and self.question.region_of_interest:
            return self.question.region_of_interest.get("explanation_image")
        return None

    @property
    def explanation_video(self) -> Optional[str]:
        if self.question and self.question.region_of_interest:
            return self.question.region_of_interest.get("explanation_video")
        return None

    @property
    def correct_option_id(self) -> Optional[uuid.UUID]:
        if self.question:
            for opt in self.question.options:
                if opt.is_correct:
                    return opt.id
        return None

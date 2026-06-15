import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Integer, Float, Boolean, DateTime, func, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import QuestionType

class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    slide_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("slides.id", ondelete="SET NULL"), nullable=True)
    question_text: Mapped[str] = mapped_column(String(2000), nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(SQLEnum(QuestionType), nullable=False)
    points: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    region_of_interest: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    exam: Mapped["Exam"] = relationship("Exam", back_populates="questions")
    slide: Mapped[Optional["Slide"]] = relationship("Slide", back_populates="exam_questions")
    options: Mapped[List["QuestionOption"]] = relationship(
        "QuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.order_index"
    )
    answers: Mapped[List["AttemptAnswer"]] = relationship("AttemptAnswer", back_populates="question")

class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_questions.id", ondelete="CASCADE"), nullable=False)
    option_text: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped["ExamQuestion"] = relationship("ExamQuestion", back_populates="options")
    answers_selected: Mapped[List["AttemptAnswer"]] = relationship("AttemptAnswer", back_populates="selected_option")

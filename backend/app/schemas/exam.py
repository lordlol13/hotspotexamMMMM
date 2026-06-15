import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.enums import QuestionType

# --- Options ---
class QuestionOptionBase(BaseModel):
    option_text: str
    is_correct: bool = False
    order_index: int

class QuestionOptionCreate(QuestionOptionBase):
    pass

class QuestionOptionResponse(QuestionOptionBase):
    id: uuid.UUID
    question_id: uuid.UUID

    class Config:
        from_attributes = True


# --- Questions ---
class ExamQuestionBase(BaseModel):
    question_text: str
    question_type: QuestionType
    points: float = 1.0
    order_index: int
    slide_id: Optional[uuid.UUID] = None
    region_of_interest: Optional[Dict[str, Any]] = None

class ExamQuestionCreate(ExamQuestionBase):
    options: Optional[List[QuestionOptionCreate]] = None

class ExamQuestionResponse(ExamQuestionBase):
    id: uuid.UUID
    exam_id: uuid.UUID
    options: List[QuestionOptionResponse] = []
    is_flagged: bool = False

    class Config:
        from_attributes = True


# --- Exams ---
class ExamBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    course_id: uuid.UUID
    duration_minutes: int = Field(60, ge=1, le=1440)
    passing_score: float = Field(60.0, ge=0, le=100)
    is_active: bool = False
    attempt_limit: int = Field(1, ge=1, le=100)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    shuffle_questions: bool = False

class ExamCreate(ExamBase):
    group_ids: Optional[List[uuid.UUID]] = None
    student_ids: Optional[List[uuid.UUID]] = None

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[float] = None
    is_active: Optional[bool] = None
    attempt_limit: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    shuffle_questions: Optional[bool] = None
    group_ids: Optional[List[uuid.UUID]] = None
    student_ids: Optional[List[uuid.UUID]] = None

class ExamResponse(ExamBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    questions: List[ExamQuestionResponse] = []
    group_ids: List[uuid.UUID] = []
    student_ids: List[uuid.UUID] = []

    class Config:
        from_attributes = True


# --- Attempt Answers ---
class AttemptAnswerSubmit(BaseModel):
    question_id: uuid.UUID
    selected_option_id: Optional[uuid.UUID] = None  # Single choice
    selected_option_ids: Optional[List[uuid.UUID]] = None  # Multiple choice
    text_answer: Optional[str] = None  # Short Answer & Essay
    annotation_data: Optional[Dict[str, Any]] = None  # Slide Annotation click coordinates

class AttemptAnswerResponse(BaseModel):
    id: uuid.UUID
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    selected_option_id: Optional[uuid.UUID] = None
    selected_option_ids: Optional[List[uuid.UUID]] = None
    text_answer: Optional[str] = None
    annotation_data: Optional[Dict[str, Any]] = None
    points_awarded: Optional[float] = None
    explanation: Optional[str] = None
    explanation_image: Optional[str] = None
    explanation_video: Optional[str] = None
    correct_option_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


# --- Attempts ---
class ExamAttemptStart(BaseModel):
    exam_id: uuid.UUID

class ExamAttemptSubmit(BaseModel):
    answers: List[AttemptAnswerSubmit]

class ExamAttemptResponse(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    student_id: uuid.UUID
    attempt_number: int
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    is_graded: bool
    created_at: datetime
    updated_at: datetime
    answers: List[AttemptAnswerResponse] = []

    class Config:
        from_attributes = True


# --- Retakes ---
class ExamRetakeCreate(BaseModel):
    exam_id: uuid.UUID
    student_id: uuid.UUID
    allowed_attempts: int = Field(1, ge=1, le=100)
    expires_at: Optional[datetime] = None

class ExamRetakeResponse(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    student_id: uuid.UUID
    granted_by: Optional[uuid.UUID] = None
    allowed_attempts: int
    expires_at: Optional[datetime] = None
    is_used: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

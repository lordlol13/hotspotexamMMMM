import uuid
from typing import List
from fastapi import APIRouter, Depends, status, Response, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamQuestionCreate, ExamQuestionResponse,
    ExamAttemptResponse, ExamAttemptStart, ExamAttemptSubmit, ExamRetakeCreate, ExamRetakeResponse
)
from app.services.exam_service import ExamService
from app.dependencies import get_current_active_user, RoleChecker
from app.models.enums import UserRole
from app.models.user import User
from app.services.access_service import AccessService

router = APIRouter()

@router.get("/", response_model=List[ExamResponse])
def get_exams(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role == UserRole.STUDENT:
        return ExamService.get_exams_for_student(db, course_id, current_user.id)
    return ExamService.get_exams_by_course(db, course_id)

@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    schema: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    AccessService.require_course_manager(db, schema.course_id, current_user)
    return ExamService.create_exam(db, schema, current_user.id)

@router.post("/{exam_id}/questions", response_model=ExamQuestionResponse, status_code=status.HTTP_201_CREATED)
def add_exam_question(
    exam_id: uuid.UUID,
    schema: ExamQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    AccessService.require_exam_manager(db, exam_id, current_user)
    return ExamService.add_question(db, exam_id, schema)

@router.post("/{exam_id}/start", response_model=ExamAttemptResponse, status_code=status.HTTP_201_CREATED)
def start_exam_attempt(
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.STUDENT]))
):
    if not ExamService.can_student_access_exam(db, exam_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к этому экзамену или вы не включены в список участников."
        )
    return ExamService.start_attempt(db, exam_id, current_user.id)

@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    exam = ExamService.get_exam(db, exam_id)
    if current_user.role == UserRole.STUDENT and not ExamService.can_student_access_exam(db, exam_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this exam")

    response_data = ExamResponse.model_validate(exam)

    if current_user.role == UserRole.STUDENT:
        for q in response_data.questions:
            for opt in q.options:
                opt.is_correct = False

    return response_data

@router.post("/attempts/{attempt_id}/submit", response_model=ExamAttemptResponse)
def submit_exam_attempt(
    attempt_id: uuid.UUID,
    schema: ExamAttemptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.STUDENT]))
):

    from app.models.attempt import ExamAttempt
    db_attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if db_attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to submit this attempt")

    return ExamService.submit_attempt(db, attempt_id, schema)

@router.post("/retakes", response_model=ExamRetakeResponse, status_code=status.HTTP_201_CREATED)
def grant_exam_retake(
    schema: ExamRetakeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    AccessService.require_exam_manager(db, schema.exam_id, current_user)
    return ExamService.grant_retake(db, schema, current_user.id)

@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: uuid.UUID,
    schema: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    AccessService.require_exam_manager(db, exam_id, current_user)
    return ExamService.update_exam(db, exam_id, schema)

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    AccessService.require_exam_manager(db, exam_id, current_user)
    ExamService.delete_exam(db, exam_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/{exam_id}/questions", status_code=status.HTTP_204_NO_CONTENT)
def clear_exam_questions(
    exam_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    AccessService.require_exam_manager(db, exam_id, current_user)
    ExamService.clear_questions(db, exam_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/questions/{question_id}/flag", response_model=ExamQuestionResponse)
def flag_exam_question(
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.question import ExamQuestion
    question = db.query(ExamQuestion).filter(ExamQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    question.is_flagged = not question.is_flagged
    db.commit()
    db.refresh(question)
    return question

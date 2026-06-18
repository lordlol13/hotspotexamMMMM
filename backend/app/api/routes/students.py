import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.student_service import StudentService
from app.dependencies import RoleChecker, get_current_active_user
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserResponse
from app.models.attempt import ExamAttempt

router = APIRouter()

class UpdateStudentGroupRequest(BaseModel):
    group_id: Optional[str] = None

@router.get("/", status_code=status.HTTP_200_OK)
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT]))
):
    return StudentService.get_all_students(db, current_user=current_user)

@router.put("/{student_id}/group", status_code=status.HTTP_200_OK)
def update_student_group(
    student_id: uuid.UUID,
    data: UpdateStudentGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    group_uuid = uuid.UUID(data.group_id) if data.group_id else None
    return StudentService.update_student_group(db, student_id, group_uuid)

@router.get("/{user_id}", response_model=UserResponse)
def get_user_profile(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    if user.role == UserRole.STUDENT and user.student_profile:
        attempts = db.query(ExamAttempt).filter(
            ExamAttempt.student_id == user.id,
            ExamAttempt.submitted_at.isnot(None)
        ).all()

        total_score_pct = 0.0
        graded_count = 0
        completed_exam_ids = set()
        for att in attempts:
            completed_exam_ids.add(att.exam_id)
            if att.is_graded and att.max_score and att.max_score > 0:
                score_pct = (att.score / att.max_score) * 100
                total_score_pct += score_pct
                graded_count += 1

        avg_score = round(total_score_pct / graded_count, 1) if graded_count > 0 else 0.0
        completed_count = len(completed_exam_ids)

        if current_user.role == UserRole.STUDENT and user.hide_grades and user.id != current_user.id:
            user.student_profile.average_score = None
            user.student_profile.completed_exams = None
        else:
            user.student_profile.average_score = avg_score
            user.student_profile.completed_exams = completed_count

    if current_user.role == UserRole.STUDENT and user.is_private and user.id != current_user.id:
        masked_user = User(
            id=user.id,
            email="hidden@private.local",
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            is_private=user.is_private,
            hide_grades=user.hide_grades,
            avatar_url=user.avatar_url,
            student_profile=user.student_profile,
            teacher_profile=user.teacher_profile,
            phone="[Скрыто]",
            address="[Скрыто]",
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        return masked_user

    return user

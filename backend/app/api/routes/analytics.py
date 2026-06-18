import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.dependencies import get_current_active_user, RoleChecker
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter()

@router.get("/student", status_code=status.HTTP_200_OK)
def get_student_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.STUDENT]))
):
    return AnalyticsService.get_student_analytics(db, current_user.id)

@router.get("/teacher", status_code=status.HTTP_200_OK)
def get_teacher_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role == UserRole.STUDENT:
        return AnalyticsService.get_global_rankings(db, current_user)
    return AnalyticsService.get_teacher_analytics(db, current_user.id)

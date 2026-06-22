from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import (
    StudentRegister,
    TeacherRegister,
    UserResponse,
    Token,
    UserLogin,
    EmailVerificationConfirm,
    PasswordResetRequest,
    PasswordResetConfirm,
    ProfileUpdate,
    PasswordUpdate
)
from app.services.auth_service import AuthService
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.dependencies import get_current_user
from app.models.user import User
from app.config import settings
from app.core.exceptions import ForbiddenException
from app.models.enums import AuditAction
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/register/student", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_student(schema: StudentRegister, db: Session = Depends(get_db)):
    user = AuthService.register_student(db, schema)
    return user

@router.post("/register/teacher", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_teacher(schema: TeacherRegister, db: Session = Depends(get_db)):
    if settings.ENVIRONMENT == "production" and not settings.ALLOW_TEACHER_REGISTRATION:
        raise ForbiddenException("Teacher self-registration is disabled")
    user = AuthService.register_teacher(db, schema)
    return user

@router.post("/login", response_model=Token)
def login(schema: UserLogin, db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(db, schema.username_or_email, schema.password)
    AuditService.record(db, AuditAction.LOGIN, "user", user.id, user.id)
    db.commit()
    access_token = create_access_token(subject=user.id, role=user.role.value)
    refresh_token = create_refresh_token(subject=user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/login-form", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    AuditService.record(db, AuditAction.LOGIN, "user", user.id, user.id)
    db.commit()
    access_token = create_access_token(subject=user.id, role=user.role.value)
    refresh_token = create_refresh_token(subject=user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(
    payload: dict | None = Body(default=None),
    refresh_token_query: str | None = Query(default=None, alias="refresh_token"),
    db: Session = Depends(get_db),
):
    raw_token = (payload or {}).get("refresh_token") or refresh_token_query
    token_payload = verify_token(raw_token, expected_type="refresh") if raw_token else None
    if not token_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    new_refresh_token = create_refresh_token(subject=user.id)
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/verify-email")
def verify_email(schema: EmailVerificationConfirm, db: Session = Depends(get_db)):
    AuthService.verify_email(db, schema.token)
    return {"message": "Email verified successfully"}

@router.post("/password-reset/request")
def request_password_reset(schema: PasswordResetRequest, db: Session = Depends(get_db)):
    AuthService.request_password_reset(db, schema.email)
    return {"message": "If the account exists, password reset instructions were sent."}

@router.post("/password-reset/confirm")
def confirm_password_reset(schema: PasswordResetConfirm, db: Session = Depends(get_db)):
    AuthService.confirm_password_reset(db, schema.token, schema.new_password)
    return {"message": "Password reset successfully"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_current_user(
    schema: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_user = AuthService.update_profile(db, current_user.id, schema)
    return updated_user

@router.put("/password")
def update_current_user_password(
    schema: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    AuthService.update_password(db, current_user.id, schema)
    return {"message": "Password updated successfully"}

@router.post("/purge-database")
def purge_database(secret_key: str = Query(...), db: Session = Depends(get_db)):
    if secret_key != settings.JWT_SECRET:
        raise ForbiddenException("Invalid secret key")
    import os
    import shutil
    from sqlalchemy import text
    try:
        db.execute(text("TRUNCATE TABLE audit_logs, notifications, slide_view_logs, annotations, attempt_answers, exam_attempts, exam_questions, exam_retakes, regions, question_options, exams, exam_groups, exam_students, course_enrollments, course_groups, courses, groups, slides CASCADE;"))
        db.execute(text("DELETE FROM students;"))
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if admin_user:
            db.execute(text("DELETE FROM teachers WHERE id != :admin_id;"), {"admin_id": admin_user.id})
            db.execute(text("DELETE FROM users WHERE id != :admin_id;"), {"admin_id": admin_user.id})
        else:
            db.execute(text("DELETE FROM teachers;"))
            db.execute(text("DELETE FROM users;"))
        db.commit()
        uploads_slides_dir = os.path.join(settings.UPLOAD_DIR, "slides")
        if os.path.exists(uploads_slides_dir):
            shutil.rmtree(uploads_slides_dir, ignore_errors=True)
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

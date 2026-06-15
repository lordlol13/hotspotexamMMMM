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
    """
    Register a new student.
    Will auto-create a user account, link a student profile, and auto-assign to a student group.
    """
    user = AuthService.register_student(db, schema)
    return user

@router.post("/register/teacher", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_teacher(schema: TeacherRegister, db: Session = Depends(get_db)):
    """
    Register a new teacher.
    """
    if settings.ENVIRONMENT == "production" and not settings.ALLOW_TEACHER_REGISTRATION:
        raise ForbiddenException("Teacher self-registration is disabled")
    user = AuthService.register_teacher(db, schema)
    return user

@router.post("/login", response_model=Token)
def login(schema: UserLogin, db: Session = Depends(get_db)):
    """
    Log in with username or email and password. Returns access and refresh tokens.
    """
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
    """
    Log in using OAuth2 Form content-type (urlencoded).
    Required to support Swagger UI /docs authorization lock.
    """
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
    """
    Refresh and obtain a new access token using a valid refresh token.
    """
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
    """
    Verify user email address using the registration verification token.
    """
    AuthService.verify_email(db, schema.token)
    return {"message": "Email verified successfully"}

@router.post("/password-reset/request")
def request_password_reset(schema: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Generate password reset token.
    """
    AuthService.request_password_reset(db, schema.email)
    return {"message": "If the account exists, password reset instructions were sent."}

@router.post("/password-reset/confirm")
def confirm_password_reset(schema: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Confirm reset token and update password.
    """
    AuthService.confirm_password_reset(db, schema.token, schema.new_password)
    return {"message": "Password reset successfully"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Get current logged-in user profile details.
    """
    return current_user

@router.put("/me", response_model=UserResponse)
def update_current_user(
    schema: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current logged-in user profile details.
    """
    updated_user = AuthService.update_profile(db, current_user.id, schema)
    return updated_user

@router.put("/password")
def update_current_user_password(
    schema: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current logged-in user password.
    """
    AuthService.update_password(db, current_user.id, schema)
    return {"message": "Password updated successfully"}

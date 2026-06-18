import uuid
from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.core.exceptions import AuthException, ForbiddenException
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login-form"
)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise AuthException("Could not validate credentials")

    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise AuthException("Token is missing subject claim")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthException("Invalid user ID in token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthException("User not found")

    if not user.is_active:
        raise ForbiddenException("User account is inactive")

    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise ForbiddenException("User is inactive")
    return current_user

def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_verified:
        raise ForbiddenException("Email address is not verified")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(
                f"Access denied: Requires one of these roles: {[r.value for r in self.allowed_roles]}"
            )
        return current_user

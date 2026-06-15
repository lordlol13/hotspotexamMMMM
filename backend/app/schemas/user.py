import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.enums import UserRole

# Core User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=10, max_length=128)
    role: UserRole = UserRole.STUDENT

# Student Specific Registration Schema
class StudentRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    student_code: str = Field(..., description="Student ID/Matriculation Code", min_length=3, max_length=50)
    faculty: str = Field(..., min_length=2, max_length=255)
    course_name: str = Field(..., min_length=2, max_length=255)
    group_name: Optional[str] = Field(None, description="Name of student group/class", min_length=2, max_length=100)

# Teacher Specific Registration Schema
class TeacherRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    department: Optional[str] = Field(None, min_length=2, max_length=255)
    title: Optional[str] = Field(None, min_length=2, max_length=100)

# Profiles in response
class StudentProfileResponse(BaseModel):
    student_code: Optional[str] = None
    faculty: Optional[str] = None
    course_name: Optional[str] = None
    group_id: Optional[uuid.UUID] = None
    average_score: Optional[float] = None
    completed_exams: Optional[int] = None

    class Config:
        from_attributes = True

class TeacherProfileResponse(BaseModel):
    department: Optional[str] = None
    title: Optional[str] = None

    class Config:
        from_attributes = True

# User Response Schema
class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_private: bool = False
    hide_grades: bool = False
    created_at: datetime
    updated_at: datetime
    student_profile: Optional[StudentProfileResponse] = None
    teacher_profile: Optional[TeacherProfileResponse] = None

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=20)

# Password Reset Request
class PasswordResetRequest(BaseModel):
    email: EmailStr

# Password Reset Confirmation
class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=10, max_length=128)

# Email Verification Confirmation
class EmailVerificationConfirm(BaseModel):
    token: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    faculty: Optional[str] = None
    course_name: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_private: Optional[bool] = None
    hide_grades: Optional[bool] = None

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=10, max_length=128)

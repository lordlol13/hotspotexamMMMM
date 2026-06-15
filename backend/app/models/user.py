import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import UserRole

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reset_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hide_grades: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # 1-to-1 relationships for profiles
    student_profile: Mapped[Optional["Student"]] = relationship(
        "Student", 
        back_populates="user", 
        uselist=False, 
        cascade="all, delete-orphan"
    )
    teacher_profile: Mapped[Optional["Teacher"]] = relationship(
        "Teacher", 
        back_populates="user", 
        uselist=False, 
        cascade="all, delete-orphan"
    )

    # Relationships
    slides: Mapped[List["Slide"]] = relationship("Slide", back_populates="uploader", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    slide_view_logs: Mapped[List["SlideViewLog"]] = relationship("SlideViewLog", back_populates="user", cascade="all, delete-orphan")
    annotations: Mapped[List["Annotation"]] = relationship("Annotation", back_populates="user", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    student_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    faculty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    course_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="students")
    exam_attempts: Mapped[List["ExamAttempt"]] = relationship("ExamAttempt", back_populates="student", cascade="all, delete-orphan")
    enrollments: Mapped[List["CourseEnrollment"]] = relationship("CourseEnrollment", back_populates="student", cascade="all, delete-orphan")
    retakes: Mapped[List["ExamRetake"]] = relationship("ExamRetake", back_populates="student", cascade="all, delete-orphan")
    exams: Mapped[List["Exam"]] = relationship(
        "Exam",
        secondary="exam_students",
        back_populates="students"
    )


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    department: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="teacher_profile")
    courses: Mapped[List["Course"]] = relationship("Course", back_populates="teacher", cascade="all, delete-orphan")

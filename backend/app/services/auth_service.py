import uuid
import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, Student, Teacher
from app.models.group import Group
from app.models.enums import UserRole
from app.schemas.user import StudentRegister, TeacherRegister, UserResponse, ProfileUpdate, PasswordUpdate
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.core.exceptions import BadRequestException, AuthException, NotFoundException
from app.config import settings
from app.services.email_service import EmailService

logger = logging.getLogger("app.services.auth")

class AuthService:
    @staticmethod
    def register_student(db: Session, schema: StudentRegister) -> User:
        """
        Register a new student. 
        Creates a User identity record and a linked Student profile.
        If a group_name is provided, links or creates the group.
        """
        # Check if email already registered
        if db.query(User).filter(User.email == schema.email).first():
            raise BadRequestException("Email already registered")

        # Generate a unique username from email
        username = schema.email.split("@")[0]
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        # Check if student_code already exists
        if db.query(Student).filter(Student.student_code == schema.student_code).first():
            raise BadRequestException("Student ID already exists in the system")

        # Handle Group lookup or creation
        group_id = None
        if schema.group_name and schema.group_name != "Без группы":
            group = db.query(Group).filter(Group.name == schema.group_name).first()
            if not group:
                group = Group(
                    name=schema.group_name, 
                    description=f"Auto-created group during registration for student {schema.first_name} {schema.last_name}"
                )
                db.add(group)
                db.flush()  # Populates group.id
            group_id = group.id

        # Generate verification token
        verification_token = str(uuid.uuid4())

        # Create core User record
        user = User(
            email=schema.email,
            username=username,
            hashed_password=get_password_hash(schema.password),
            first_name=schema.first_name,
            last_name=schema.last_name,
            role=UserRole.STUDENT,
            is_verified=False,  # Needs email verification
            verification_token=verification_token
        )
        db.add(user)
        db.flush()

        # Create linked Student Profile
        student = Student(
            id=user.id,
            student_code=schema.student_code,
            faculty=schema.faculty,
            course_name=schema.course_name,
            group_id=group_id
        )
        db.add(student)
        db.commit()
        db.refresh(user)

        # Email Dispatch
        verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        subject = "Подтверждение регистрации"
        body = f"""
        <p>Здравствуйте, {user.first_name}!</p>
        <p>Спасибо за регистрацию. Пожалуйста, подтвердите вашу почту, перейдя по ссылке ниже:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        """
        EmailService.send_email(user.email, subject, body)

        return user

    @staticmethod
    def register_teacher(db: Session, schema: TeacherRegister) -> User:
        """
        Register a new teacher.
        Creates a User identity record and a linked Teacher profile.
        """
        if db.query(User).filter(User.email == schema.email).first():
            raise BadRequestException("Email already registered")

        if db.query(User).filter(User.username == schema.username).first():
            raise BadRequestException("Username already taken")

        # Generate verification token
        verification_token = str(uuid.uuid4())

        user = User(
            email=schema.email,
            username=schema.username,
            hashed_password=get_password_hash(schema.password),
            first_name=schema.first_name,
            last_name=schema.last_name,
            role=UserRole.TEACHER,
            is_verified=False,
            verification_token=verification_token
        )
        db.add(user)
        db.flush()

        teacher = Teacher(
            id=user.id,
            department=schema.department,
            title=schema.title
        )
        db.add(teacher)
        db.commit()
        db.refresh(user)

        # Email Dispatch
        verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        subject = "Подтверждение регистрации преподавателя"
        body = f"""
        <p>Здравствуйте, {user.first_name}!</p>
        <p>Ваша учетная запись преподавателя создана. Пожалуйста, подтвердите вашу почту, перейдя по ссылке ниже:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        """
        EmailService.send_email(user.email, subject, body)

        return user

    @staticmethod
    def authenticate_user(db: Session, username_or_email: str, password: str) -> User:
        """
        Authenticate a user by username or email.
        """
        user = db.query(User).filter(
            (func.lower(User.username) == func.lower(username_or_email)) | 
            (func.lower(User.email) == func.lower(username_or_email))
        ).first()

        if not user:
            raise AuthException("Incorrect username, email, or password")

        if not verify_password(password, user.hashed_password):
            raise AuthException("Incorrect username, email, or password")

        if not user.is_active:
            raise AuthException("User account is inactive")

        if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
            raise AuthException("Email is not verified. Please check your inbox for the verification link.")

        return user

    @staticmethod
    def verify_email(db: Session, token: str) -> bool:
        """
        Confirm user email verification using the sent token.
        """
        user = db.query(User).filter(User.verification_token == token).first()
        if not user:
            raise BadRequestException("Invalid or expired verification token")

        user.is_verified = True
        user.verification_token = None
        db.commit()
        return True

    @staticmethod
    def request_password_reset(db: Session, email: str) -> str:
        """
        Generate password reset token and send reset link.
        """
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return ""

        reset_token = str(uuid.uuid4())
        user.reset_token = reset_token
        db.commit()

        # Email Dispatch
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        subject = "Сброс пароля"
        body = f"""
        <p>Здравствуйте!</p>
        <p>Вы запросили сброс пароля. Для создания нового пароля перейдите по ссылке:</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
        """
        EmailService.send_email(user.email, subject, body)

        return reset_token

    @staticmethod
    def confirm_password_reset(db: Session, token: str, new_password: str) -> bool:
        """
        Validate reset token and update password.
        """
        user = db.query(User).filter(User.reset_token == token).first()
        if not user:
            raise BadRequestException("Invalid or expired password reset token")

        user.hashed_password = get_password_hash(new_password)
        user.reset_token = None
        db.commit()
        return True

    @staticmethod
    def update_profile(db: Session, user_id: uuid.UUID, schema: ProfileUpdate) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException("User not found")
            
        if schema.email and schema.email != user.email:
            # Check if email already taken
            if db.query(User).filter(User.email == schema.email).first():
                raise BadRequestException("Email already in use")
            user.email = schema.email
            
        if schema.first_name:
            user.first_name = schema.first_name
        if schema.last_name:
            user.last_name = schema.last_name
            
        if schema.phone is not None:
            user.phone = schema.phone
        if schema.address is not None:
            user.address = schema.address
        if schema.is_private is not None:
            user.is_private = schema.is_private
        if schema.hide_grades is not None:
            user.hide_grades = schema.hide_grades
            
        # Update linked profile if exists
        if user.role == UserRole.STUDENT and user.student_profile:
            if schema.faculty is not None:
                user.student_profile.faculty = schema.faculty
            if schema.course_name is not None:
                user.student_profile.course_name = schema.course_name
        elif user.role == UserRole.TEACHER and user.teacher_profile:
            if schema.department is not None:
                user.teacher_profile.department = schema.department
            if schema.title is not None:
                user.teacher_profile.title = schema.title
                
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_password(db: Session, user_id: uuid.UUID, schema: PasswordUpdate) -> bool:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException("User not found")
            
        if not verify_password(schema.old_password, user.hashed_password):
            raise BadRequestException("Incorrect current password")
            
        user.hashed_password = get_password_hash(schema.new_password)
        db.commit()
        return True

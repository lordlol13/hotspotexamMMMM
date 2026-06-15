import logging
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User, Teacher
from app.models.enums import UserRole
from app.core.security import get_password_hash
from app.config import settings

logger = logging.getLogger("app.core.init_db")


def init_db() -> None:
    """
    Ensure the admin user exists in the database.

    Called once at application startup. If the admin account (identified by
    ADMIN_EMAIL) is already present, this is a no-op. Otherwise a new user
    with role TEACHER and is_verified=True is created so the admin can log
    in immediately without requiring SMTP email verification.
    """
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if existing:
            logger.info("init_db: admin user already exists, skipping creation")
            return

        logger.info("init_db: creating admin user %s", settings.ADMIN_EMAIL)

        admin_user = User(
            email=settings.ADMIN_EMAIL,
            username=settings.ADMIN_USERNAME,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            first_name=settings.ADMIN_FULL_NAME,
            last_name="",
            role=UserRole.TEACHER,
            is_active=True,
            is_verified=True,  # Pre-verified so admin can log in without SMTP
            verification_token=None,
        )
        db.add(admin_user)
        db.flush()

        teacher_profile = Teacher(
            id=admin_user.id,
            department="Administration",
            title="System Administrator",
        )
        db.add(teacher_profile)
        db.commit()

        logger.info(
            "init_db: admin user created successfully (email=%s, username=%s)",
            settings.ADMIN_EMAIL,
            settings.ADMIN_USERNAME,
        )
    except Exception:
        db.rollback()
        logger.exception("init_db: failed to create admin user")
        raise
    finally:
        db.close()

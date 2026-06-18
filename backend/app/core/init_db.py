import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, Teacher
from app.models.enums import UserRole
from app.core.security import get_password_hash
from app.config import settings

logger = logging.getLogger("app.core.init_db")

def init_db() -> None:
    db: Session = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin_user:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                username=settings.ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                first_name=settings.ADMIN_FULL_NAME,
                last_name="",
                role=UserRole.TEACHER,
                is_active=True,
                is_verified=True,
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
        else:
            teacher_profile = db.query(Teacher).filter(Teacher.id == admin_user.id).first()
            if not teacher_profile:
                teacher_profile = Teacher(
                    id=admin_user.id,
                    department="Administration",
                    title="System Administrator",
                )
                db.add(teacher_profile)
                db.commit()
    except Exception:
        db.rollback()
        logger.exception("init_db failed")
        raise
    finally:
        db.close()

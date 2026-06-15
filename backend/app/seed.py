import sys
import uuid
from app.database import SessionLocal
from app.models.user import User, Teacher, Student
from app.models.group import Group
from app.models.course import Course
from app.models.exam import Exam
from app.models.attempt import ExamAttempt
from app.models.enrollment import CourseEnrollment
from app.models.enums import UserRole
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    try:
        print("Cleaning up database (removing all experimental data)...")

        db.query(ExamAttempt).delete()
        db.query(CourseEnrollment).delete()
        db.query(Student).delete()
        db.query(Teacher).delete()
        db.query(Exam).delete()
        db.query(Course).delete()
        db.query(Group).delete()
        db.query(User).delete()
        db.commit()
        print("Database cleared successfully.")

        admin_email = "admin@hotspot.com"
        admin_password = "admin12345"
        print(f"Creating default admin account: {admin_email}...")

        admin_user = User(
            email=admin_email,
            username="admin",
            hashed_password=get_password_hash(admin_password),
            first_name="Администратор",
            last_name="Системы",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )
        db.add(admin_user)
        db.flush()

        profile = Teacher(
            id=admin_user.id,
            department="Администрация",
            title="Главный администратор"
        )
        db.add(profile)
        db.commit()

        print("==================================================")
        print("Database clean-up and seeding completed!")
        print(f"Admin Email: {admin_email}")
        print(f"Admin Password: {admin_password}")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()

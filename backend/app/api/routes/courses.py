import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_active_user
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.enums import UserRole
from app.models.user import Student, Teacher, User
from app.schemas.course import CourseResponse


router = APIRouter()


@router.get("/primary", response_model=CourseResponse)
def get_primary_course(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role == UserRole.STUDENT:
        enrollment = (
            db.query(CourseEnrollment)
            .filter(
                CourseEnrollment.student_id == current_user.id,
                CourseEnrollment.is_active.is_(True),
            )
            .order_by(CourseEnrollment.enrolled_at.asc())
            .first()
        )
        if not enrollment:
            student = db.query(Student).filter(Student.id == current_user.id).first()
            course = None
            if student and student.course_name:
                course = db.query(Course).filter(
                    Course.is_active.is_(True),
                    Course.title.ilike(student.course_name),
                ).first()
            if not course:
                active_courses = db.query(Course).filter(Course.is_active.is_(True)).limit(2).all()
                if len(active_courses) == 1:
                    course = active_courses[0]
            if not course:
                raise NotFoundException("No active course is assigned to this account")
            enrollment = CourseEnrollment(student_id=current_user.id, course_id=course.id, is_active=True)
            db.add(enrollment)
            db.commit()
            db.refresh(enrollment)
        return enrollment.course

    course = (
        db.query(Course)
        .filter(Course.teacher_id == current_user.id, Course.is_active.is_(True))
        .order_by(Course.created_at.asc())
        .first()
    )
    if course:
        return course

    if current_user.role == UserRole.ADMIN:
        course = db.query(Course).filter(Course.is_active.is_(True)).order_by(Course.created_at.asc()).first()
        if course:
            return course

    teacher = db.query(Teacher).filter(Teacher.id == current_user.id).first()
    if not teacher:
        teacher = Teacher(id=current_user.id, department="", title="Instructor")
        db.add(teacher)
        db.flush()

    course = Course(
        id=uuid.uuid4(),
        title="Основной курс",
        description=None,
        code=f"COURSE-{current_user.id.hex[:8].upper()}",
        teacher_id=current_user.id,
        is_active=True,
        max_students=100,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

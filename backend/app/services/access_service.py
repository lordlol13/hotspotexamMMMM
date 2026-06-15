import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.course import Course
from app.models.enums import UserRole
from app.models.slide import Slide
from app.models.exam import Exam
from app.models.user import User

class AccessService:
    @staticmethod
    def require_course_manager(db: Session, course_id: uuid.UUID, user: User) -> Course:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise NotFoundException("Course not found")
        if user.role != UserRole.ADMIN and course.teacher_id != user.id:
            raise ForbiddenException("You do not manage this course")
        return course

    @staticmethod
    def require_slide_manager(db: Session, slide_id: uuid.UUID, user: User) -> Slide:
        slide = db.query(Slide).filter(Slide.id == slide_id).first()
        if not slide:
            raise NotFoundException("Slide not found")
        AccessService.require_course_manager(db, slide.course_id, user)
        return slide

    @staticmethod
    def require_exam_manager(db: Session, exam_id: uuid.UUID, user: User) -> Exam:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise NotFoundException("Exam not found")
        AccessService.require_course_manager(db, exam.course_id, user)
        return exam

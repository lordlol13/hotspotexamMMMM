import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import Student, User
from app.models.group import Group
from app.models.enums import UserRole

class StudentService:

    @staticmethod
    def get_all_students(db: Session, current_user: Optional[User] = None) -> List[dict]:
        students = (
            db.query(Student, User, Group)
            .join(User, Student.id == User.id)
            .outerjoin(Group, Student.group_id == Group.id)
            .order_by(User.last_name, User.first_name)
            .all()
        )

        result = []
        for student, user, group in students:
            email = user.email
            student_code = student.student_code or ""

            if current_user and current_user.role == UserRole.STUDENT and user.is_private and user.id != current_user.id:
                email = "hidden@private.local"
                student_code = "[Скрыто]"

            result.append({
                "id": str(student.id),
                "name": f"{user.first_name} {user.last_name}",
                "email": email,
                "group_id": str(student.group_id) if student.group_id else "",
                "group_name": group.name if group else "Без группы",
                "student_code": student_code,
                "faculty": student.faculty or "",
                "course_name": student.course_name or "",
            })
        return result

    @staticmethod
    def update_student_group(db: Session, student_id: uuid.UUID, group_id: Optional[uuid.UUID]) -> dict:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Студент не найден."
            )

        if group_id is not None:
            group = db.query(Group).filter(Group.id == group_id).first()
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Группа не найдена."
                )

        student.group_id = group_id
        db.commit()
        db.refresh(student)

        user = db.query(User).filter(User.id == student.id).first()
        group = db.query(Group).filter(Group.id == student.group_id).first() if student.group_id else None

        return {
            "id": str(student.id),
            "name": f"{user.first_name} {user.last_name}" if user else "",
            "email": user.email if user else "",
            "group_id": str(student.group_id) if student.group_id else "",
            "group_name": group.name if group else "Без группы",
        }

    @staticmethod
    def remove_from_group(db: Session, student_id: uuid.UUID) -> dict:
        return StudentService.update_student_group(db, student_id, None)

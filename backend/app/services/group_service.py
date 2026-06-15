import uuid
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.group import Group
from app.models.user import Student
from app.schemas.group import GroupCreate, GroupUpdate


class GroupService:

    @staticmethod
    def get_all_groups(db: Session) -> List[dict]:
        """Получить все группы с количеством студентов."""
        groups_with_counts = (
            db.query(Group, func.count(Student.id).label("student_count"))
            .outerjoin(Student, Group.id == Student.group_id)
            .group_by(Group.id)
            .order_by(Group.name)
            .all()
        )

        result = []
        for g, student_count in groups_with_counts:
            result.append({
                "id": str(g.id),
                "name": g.name,
                "description": g.description,
                "student_count": student_count or 0,
                "created_at": g.created_at.isoformat() if g.created_at else "",
            })
        return result

    @staticmethod
    def create_group(db: Session, data: GroupCreate) -> dict:
        """Создать новую группу."""
        existing = db.query(Group).filter(Group.name == data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Группа с названием '{data.name}' уже существует."
            )

        group = Group(
            id=uuid.uuid4(),
            name=data.name,
            description=data.description,
        )
        db.add(group)
        db.commit()
        db.refresh(group)

        return {
            "id": str(group.id),
            "name": group.name,
            "description": group.description,
            "student_count": 0,
            "created_at": group.created_at.isoformat() if group.created_at else "",
        }

    @staticmethod
    def update_group(db: Session, group_id: uuid.UUID, data: GroupUpdate) -> dict:
        """Обновить группу."""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Группа не найдена."
            )

        if data.name is not None:
            group.name = data.name
        if data.description is not None:
            group.description = data.description

        db.commit()
        db.refresh(group)

        student_count = db.query(func.count(Student.id)).filter(Student.group_id == group.id).scalar() or 0
        return {
            "id": str(group.id),
            "name": group.name,
            "description": group.description,
            "student_count": student_count,
            "created_at": group.created_at.isoformat() if group.created_at else "",
        }

    @staticmethod
    def delete_group(db: Session, group_id: uuid.UUID) -> None:
        """Удалить группу. Студенты этой группы получают group_id = None."""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Группа не найдена."
            )

        # Отвязать студентов от группы
        db.query(Student).filter(Student.group_id == group_id).update(
            {Student.group_id: None}, synchronize_session="fetch"
        )

        db.delete(group)
        db.commit()

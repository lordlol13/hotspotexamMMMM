import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.group_service import GroupService
from app.schemas.group import GroupCreate, GroupUpdate
from app.dependencies import RoleChecker
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter()


@router.get("/public", status_code=status.HTTP_200_OK)
def list_groups_public(db: Session = Depends(get_db)):
    """Получить список всех групп без авторизации (для формы регистрации)."""
    return GroupService.get_all_groups(db)


@router.get("/", status_code=status.HTTP_200_OK)
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """Получить список всех групп с количеством студентов."""
    return GroupService.get_all_groups(db)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """Создать новую группу."""
    return GroupService.create_group(db, data)


@router.put("/{group_id}", status_code=status.HTTP_200_OK)
def update_group(
    group_id: uuid.UUID,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """Обновить группу."""
    return GroupService.update_group(db, group_id, data)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """Удалить группу. Студенты переводятся в 'Без группы'."""
    GroupService.delete_group(db, group_id)

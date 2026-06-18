import uuid
from datetime import datetime

from pydantic import BaseModel


class CourseResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    code: str
    teacher_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

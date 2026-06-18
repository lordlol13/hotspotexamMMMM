import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class SlideBase(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: uuid.UUID

class SlideCreate(SlideBase):
    pass

class SlideResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    original_filename: str
    content_sha256: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    mpp: Optional[float] = None
    objective_power: Optional[float] = None
    is_processed: bool
    course_id: uuid.UUID
    uploaded_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

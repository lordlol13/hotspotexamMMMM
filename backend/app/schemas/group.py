from typing import Optional
from pydantic import BaseModel

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    student_count: int = 0
    created_at: str

    model_config = {"from_attributes": True}

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.models.enums import RegionType, RegionContentType

class RegionBase(BaseModel):
    title: str
    description: Optional[str] = None
    region_type: RegionType
    geometry: Dict[str, Any]  # Stores coordinates in %
    content_type: Optional[RegionContentType] = None
    content_data: Optional[Dict[str, Any]] = None  # Holds question options, YouTube links, audio files, etc.

class RegionCreate(RegionBase):
    slide_id: uuid.UUID

class RegionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    geometry: Optional[Dict[str, Any]] = None
    content_type: Optional[RegionContentType] = None
    content_data: Optional[Dict[str, Any]] = None

class RegionResponse(BaseModel):
    id: uuid.UUID
    slide_id: uuid.UUID
    title: str
    description: Optional[str] = None
    region_type: RegionType
    geometry: Dict[str, Any]
    content_type: Optional[RegionContentType] = None
    content_data: Optional[Dict[str, Any]] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

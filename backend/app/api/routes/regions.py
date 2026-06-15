import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, status, Response, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.region import RegionCreate, RegionUpdate, RegionResponse
from app.services.region_service import RegionService
from app.dependencies import get_current_active_user, RoleChecker
from app.models.enums import UserRole
from app.models.user import User
from app.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.services.access_service import AccessService

router = APIRouter()

@router.post("/", response_model=RegionResponse, status_code=status.HTTP_201_CREATED)
def create_region(
    schema: RegionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """
    Create a new region of interest on a slide.
    Role: Teacher or Admin.
    """
    AccessService.require_slide_manager(db, schema.slide_id, current_user)
    return RegionService.create_region(db, schema, current_user.id)

@router.get("/slide/{slide_id}", response_model=List[RegionResponse])
def list_slide_regions(
    slide_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all regions defined for a specific slide."""
    return RegionService.list_regions_by_slide(db, slide_id)

@router.get("/{region_id}", response_model=RegionResponse)
def get_region(
    region_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific region metadata and configuration."""
    return RegionService.get_region(db, region_id)

@router.put("/{region_id}", response_model=RegionResponse)
def update_region(
    region_id: uuid.UUID,
    schema: RegionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """
    Update coordinates or content configuration for a slide region.
    Role: Teacher or Admin.
    """
    region = RegionService.get_region(db, region_id)
    AccessService.require_slide_manager(db, region.slide_id, current_user)
    return RegionService.update_region(db, region_id, schema)

@router.delete("/{region_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_region(
    region_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """
    Delete a slide region.
    Role: Teacher or Admin.
    """
    region = RegionService.get_region(db, region_id)
    AccessService.require_slide_manager(db, region.slide_id, current_user)
    RegionService.delete_region(db, region_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/upload-media")
def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """
    Upload a media file (image/video) for a region explanation/question.
    """
    import os
    media_dir = os.path.join(settings.UPLOAD_DIR, "media")
    os.makedirs(media_dir, exist_ok=True)

    allowed_types = {"image/jpeg", "image/png", "image/webp", "application/pdf", "audio/mpeg", "video/mp4"}
    if file.content_type not in allowed_types:
        raise BadRequestException("Unsupported media type")
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(media_dir, filename)

    try:
        total = 0
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                total += len(chunk)
                if total > settings.MAX_MEDIA_UPLOAD_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise BadRequestException("Media exceeds configured upload limit")
                buffer.write(chunk)
    except BadRequestException:
        raise
    except OSError:
        raise BadRequestException("Failed to save media")

    return {"url": f"/api/v1/regions/media/{filename}"}

@router.get("/media/{filename}")
def get_media_file(filename: str, current_user: User = Depends(get_current_active_user)):
    """
    Serve uploaded media files.
    """
    import os
    safe_filename = os.path.basename(filename)
    if safe_filename != filename:
        raise BadRequestException("Invalid filename")
    media_path = os.path.join(settings.UPLOAD_DIR, "media", safe_filename)
    if not os.path.exists(media_path):
        raise NotFoundException("Media file not found")
    return FileResponse(media_path)

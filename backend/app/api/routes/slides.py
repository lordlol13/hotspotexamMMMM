import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, Response, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.slide import SlideResponse
from app.services.slide_service import SlideService
from app.dependencies import get_current_active_user, RoleChecker
from app.models.enums import UserRole
from app.models.user import User
from app.config import settings
from app.services.access_service import AccessService
from app.services.audit_service import AuditService
from app.models.enums import AuditAction
from app.core.tile_tokens import create_tile_token, verify_tile_token

router = APIRouter()

@router.post("/upload", response_model=SlideResponse, status_code=status.HTTP_201_CREATED)
def upload_slide(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    course_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """
    Upload a microscopy slide (SVS, TIFF, PNG, JPG, WEBP).
    Role: Teacher or Admin.
    """
    AccessService.require_course_manager(db, course_id, current_user)
    slide = SlideService.upload_slide(
        db=db,
        title=title,
        description=description,
        course_id=course_id,
        user_id=current_user.id,
        file=file,
        background_tasks=background_tasks
    )
    AuditService.record(db, AuditAction.UPLOAD, "slide", current_user.id, slide.id, {"filename": slide.original_filename})
    db.commit()
    return slide

@router.get("/course/{course_id}", response_model=List[SlideResponse])
def list_course_slides(course_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """List all slides uploaded for a specific course."""
    return SlideService.list_slides_by_course(db, course_id)

@router.get("/{slide_id}", response_model=SlideResponse)
def get_slide_metadata(slide_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get metadata for a slide."""
    return SlideService.get_slide(db, slide_id)

@router.get("/{slide_id}/dzi")
def get_slide_dzi(slide_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Get Deep Zoom Image (DZI) XML descriptor for OpenSeadragon viewer.
    """
    slide = SlideService.get_slide(db, slide_id)

    from app.utils.svs_processor import UnifiedSlideProcessor
    processor = UnifiedSlideProcessor(slide.file_path)
    xml_content = processor.get_dzi_xml()
    processor.close()
    return Response(content=xml_content, media_type="application/xml", headers={"Cache-Control": f"private, max-age={settings.TILE_CACHE_MAX_AGE_SECONDS}"})

@router.get("/{slide_id}/access-token")
def get_slide_access_token(
    slide_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Issue a short-lived signed token (10 min) for tile access.
    Frontend passes this token as ?token=... in every tile URL.
    Required because OpenSeadragon issues many parallel XHR tile
    requests that we cannot reliably authorize via Authorization
    headers (token refresh race, CORS preflight, etc.).
    """
    slide = SlideService.get_slide(db, slide_id)
    if not slide.is_processed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slide is still being processed",
        )
    token = create_tile_token(
        slide_id=slide.id,
        user_id=current_user.id,
        role=str(current_user.role),
    )
    return {"access_token": token, "token_type": "Bearer", "expires_in": 600}


@router.get("/{slide_id}/tiles/{level}/{col}_{row}.jpeg")
@router.get("/{slide_id}/tiles/{level}/{col}_{row}.jpg")
def get_slide_tile(
    slide_id: uuid.UUID,
    level: int,
    col: int,
    row: int,
    token: str = "",
    db: Session = Depends(get_db),
):
    """
    Serve slide tiles dynamically on-demand.
    Used by OpenSeadragon for pan/zoom resolution changes.
    Authorization is via a short-lived signed `token` query param
    (issued by /access-token), not via JWT. This is intentional:
    OpenSeadragon's tile XHRs can't reliably carry Authorization
    headers across all the levels it requests in parallel.
    """
    payload = verify_tile_token(token, expected_slide_id=slide_id)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired tile access token",
        )

    tile_bytes = SlideService.get_slide_tile(db, slide_id, level, col, row)
    response = Response(
        content=tile_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": f"private, max-age={settings.TILE_CACHE_MAX_AGE_SECONDS}"},
    )
    return response

@router.get("/{slide_id}/thumbnail")
def get_slide_thumbnail(slide_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Serve the pre-extracted slide thumbnail preview.
    """
    slide = SlideService.get_slide(db, slide_id)
    if not slide.thumbnail_path or not os.path.exists(slide.thumbnail_path):
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Thumbnail not available")
    return FileResponse(slide.thumbnail_path, media_type="image/jpeg", headers={"Cache-Control": f"private, max-age={settings.TILE_CACHE_MAX_AGE_SECONDS}"})

@router.delete("/{slide_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slide(
    slide_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    """
    Delete a slide and purge its files from the server.
    """
    AccessService.require_slide_manager(db, slide_id, current_user)
    SlideService.delete_slide(db, slide_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

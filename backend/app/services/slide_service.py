import os
import uuid
import shutil
from io import BytesIO
from typing import List, Optional
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from PIL import Image

from app.config import settings
from app.models.slide import Slide
from app.utils.svs_processor import UnifiedSlideProcessor
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import SessionLocal

class SlideService:
    @staticmethod
    def get_slide_dir(slide_id: uuid.UUID) -> str:
        """Get the filesystem path for a slide's directory."""
        path = os.path.join(settings.UPLOAD_DIR, "slides", str(slide_id))
        os.makedirs(path, exist_ok=True)
        return path

    @classmethod
    def save_slide_file(cls, slide_id: uuid.UUID, file: UploadFile) -> str:
        """Save the raw slide file to disk."""
        slide_dir = cls.get_slide_dir(slide_id)
        ext = os.path.splitext(file.filename)[1].lower()
        file_path = os.path.join(slide_dir, f"original{ext}")

        total = 0
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                total += len(chunk)
                if total > settings.MAX_SLIDE_UPLOAD_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise BadRequestException("Slide exceeds configured upload limit")
                buffer.write(chunk)

        return file_path

    @classmethod
    def process_slide(cls, slide_id: uuid.UUID, db: Optional[Session] = None):
        """
        Open the slide to extract dimensions and metadata,
        and generate a 1024px wide thumbnail.
        Sets is_processed = True on completion.
        """
        owns_session = db is None
        db = db or SessionLocal()
        processor = None
        try:
            slide = db.query(Slide).filter(Slide.id == slide_id).first()
            if not slide:
                return
            processor = UnifiedSlideProcessor(slide.file_path)

            slide.width = processor.width
            slide.height = processor.height
            slide.mpp = processor.mpp
            slide.objective_power = processor.objective_power

            thumbnail = processor.generate_thumbnail(max_width=1024)
            thumbnail_dir = cls.get_slide_dir(slide_id)
            thumbnail_path = os.path.join(thumbnail_dir, "thumbnail.jpg")
            thumbnail.save(thumbnail_path, "JPEG", quality=85)

            slide.thumbnail_path = thumbnail_path

            slide.dzi_path = f"{settings.API_V1_STR}/slides/{slide_id}/dzi"
            slide.is_processed = True

            db.commit()
        except Exception as e:

            import logging
            logger = logging.getLogger("app.services.slide")
            logger.error(f"Failed to process slide {slide_id}: {e}")
            db.rollback()
            logger.exception("Failed to process slide %s", slide_id)
        finally:
            if processor:
                processor.close()
            if owns_session:
                db.close()

    @classmethod
    def upload_slide(
        cls,
        db: Session,
        title: str,
        description: Optional[str],
        course_id: uuid.UUID,
        user_id: uuid.UUID,
        file: UploadFile,
        background_tasks: BackgroundTasks
    ) -> Slide:
        """
        Handle upload and register a slide in the database.
        Fires metadata extraction as a background task.
        """

        ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = [
            ".svs", ".tiff", ".tif", ".ndpi", ".vms", ".bif", ".mrxs",
            ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"
        ]
        if ext not in allowed_exts:
            raise BadRequestException(f"Unsupported file format. Supported: {', '.join(allowed_exts)}")

        slide_id = uuid.uuid4()

        file_path = cls.save_slide_file(slide_id, file)

        slide = Slide(
            id=slide_id,
            title=title,
            description=description,
            original_filename=file.filename,
            file_path=file_path,
            course_id=course_id,
            uploaded_by=user_id,
            is_processed=False
        )

        db.add(slide)
        db.commit()
        db.refresh(slide)

        background_tasks.add_task(cls.process_slide, slide_id, db)

        return slide

    @classmethod
    def get_slide(cls, db: Session, slide_id: uuid.UUID) -> Slide:
        slide = db.query(Slide).filter(Slide.id == slide_id).first()
        if not slide:
            raise NotFoundException("Slide not found")
        return slide

    @classmethod
    def list_slides_by_course(cls, db: Session, course_id: uuid.UUID) -> List[Slide]:
        return db.query(Slide).filter(Slide.course_id == course_id).all()

    @classmethod
    def delete_slide(cls, db: Session, slide_id: uuid.UUID):
        slide = cls.get_slide(db, slide_id)

        slide_dir = cls.get_slide_dir(slide_id)
        if os.path.exists(slide_dir):
            shutil.rmtree(slide_dir)

        db.delete(slide)
        db.commit()
        return True

    @classmethod
    def get_slide_tile(cls, db: Session, slide_id: uuid.UUID, level: int, col: int, row: int) -> bytes:
        """
        Load slide dynamically and crop the requested tile on the fly.
        Returns tile bytes in JPEG format.
        """
        slide = cls.get_slide(db, slide_id)
        if not slide.is_processed:
            raise BadRequestException("Slide is not processed yet")

        if level < 0 or col < 0 or row < 0:
            raise BadRequestException("Invalid tile coordinates")
        cache_dir = os.path.join(cls.get_slide_dir(slide_id), "tiles", str(level))
        os.makedirs(cache_dir, exist_ok=True)
        cache_path = os.path.join(cache_dir, f"{col}_{row}.jpg")
        if os.path.exists(cache_path):
            with open(cache_path, "rb") as cached:
                return cached.read()

        processor = UnifiedSlideProcessor(slide.file_path)
        try:
            tile_image = processor.get_tile(level, col, row)

            img_byte_arr = BytesIO()

            if tile_image.mode == "RGBA":
                tile_image = tile_image.convert("RGB")
            tile_image.save(img_byte_arr, format="JPEG", quality=85, optimize=True)
            tile_bytes = img_byte_arr.getvalue()
            temp_path = f"{cache_path}.tmp"
            with open(temp_path, "wb") as cached:
                cached.write(tile_bytes)
            os.replace(temp_path, cache_path)
            return tile_bytes
        except Exception as e:
            raise BadRequestException(f"Tile generation failed: {e}")
        finally:
            processor.close()

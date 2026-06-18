import os
import uuid
import shutil
import hashlib
from io import BytesIO
from typing import List, Optional
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from PIL import Image
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models.slide import Slide
from app.utils.svs_processor import UnifiedSlideProcessor
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import SessionLocal

class SlideService:
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        digest = hashlib.sha256()
        with open(file_path, "rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def get_slide_dir(slide_id: uuid.UUID) -> str:
        path = os.path.join(settings.UPLOAD_DIR, "slides", str(slide_id))
        os.makedirs(path, exist_ok=True)
        return path

    @classmethod
    def save_slide_file(cls, slide_id: uuid.UUID, file: UploadFile) -> tuple[str, str]:
        slide_dir = cls.get_slide_dir(slide_id)
        ext = os.path.splitext(file.filename)[1].lower()
        file_path = os.path.join(slide_dir, f"original{ext}")

        file.file.seek(0)
        digest = hashlib.sha256()
        size = 0
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.MAX_SLIDE_UPLOAD_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise BadRequestException("Slide exceeds configured upload limit")
                digest.update(chunk)
                buffer.write(chunk)

        return file_path, digest.hexdigest()

    @classmethod
    def process_slide(cls, slide_id: uuid.UUID, db: Optional[Session] = None):
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

        ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = [
            ".svs", ".tiff", ".tif", ".ndpi", ".vms", ".bif", ".mrxs",
            ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"
        ]
        if ext not in allowed_exts:
            raise BadRequestException(f"Unsupported file format. Supported: {', '.join(allowed_exts)}")

        slide_id = uuid.uuid4()

        file_path, content_sha256 = cls.save_slide_file(slide_id, file)

        missing_hashes = db.query(Slide).filter(
            Slide.course_id == course_id,
            Slide.content_sha256.is_(None),
        ).all()
        for existing in missing_hashes:
            if os.path.exists(existing.file_path):
                existing.content_sha256 = cls.calculate_file_hash(existing.file_path)
        if missing_hashes:
            try:
                db.commit()
            except IntegrityError:
                db.rollback()

        duplicate = db.query(Slide).filter(
            Slide.course_id == course_id,
            Slide.content_sha256 == content_sha256,
        ).first()
        if duplicate:
            shutil.rmtree(cls.get_slide_dir(slide_id), ignore_errors=True)
            raise BadRequestException("This file is already uploaded to the course")

        slide = Slide(
            id=slide_id,
            title=title,
            description=description,
            original_filename=file.filename,
            content_sha256=content_sha256,
            file_path=file_path,
            course_id=course_id,
            uploaded_by=user_id,
            is_processed=False
        )

        db.add(slide)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            shutil.rmtree(cls.get_slide_dir(slide_id), ignore_errors=True)
            raise BadRequestException("This file is already uploaded to the course")
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

import uuid
from typing import List
from sqlalchemy.orm import Session
from app.models.region import Region
from app.schemas.region import RegionCreate, RegionUpdate
from app.core.exceptions import NotFoundException

class RegionService:
    @staticmethod
    def create_region(db: Session, schema: RegionCreate, user_id: uuid.UUID) -> Region:
        region = Region(
            slide_id=schema.slide_id,
            title=schema.title,
            description=schema.description,
            region_type=schema.region_type,
            geometry=schema.geometry,
            content_type=schema.content_type,
            content_data=schema.content_data,
            created_by=user_id
        )
        db.add(region)
        db.commit()
        db.refresh(region)
        return region

    @staticmethod
    def get_region(db: Session, region_id: uuid.UUID) -> Region:
        region = db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise NotFoundException("Region not found")
        return region

    @staticmethod
    def list_regions_by_slide(db: Session, slide_id: uuid.UUID) -> List[Region]:
        return db.query(Region).filter(Region.slide_id == slide_id).all()

    @staticmethod
    def update_region(db: Session, region_id: uuid.UUID, schema: RegionUpdate) -> Region:
        region = RegionService.get_region(db, region_id)

        update_data = schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(region, key, value)

        db.commit()
        db.refresh(region)
        return region

    @staticmethod
    def delete_region(db: Session, region_id: uuid.UUID) -> bool:
        region = RegionService.get_region(db, region_id)
        db.delete(region)
        db.commit()
        return True

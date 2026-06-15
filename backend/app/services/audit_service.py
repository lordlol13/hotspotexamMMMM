import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.enums import AuditAction

class AuditService:
    @staticmethod
    def record(
        db: Session,
        action: AuditAction,
        entity_name: str,
        user_id: Optional[uuid.UUID] = None,
        entity_id: Optional[uuid.UUID] = None,
        details: Optional[dict] = None,
    ) -> None:
        db.add(AuditLog(action=action, entity_name=entity_name, user_id=user_id, entity_id=entity_id, details=details))

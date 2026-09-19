from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.models import AuditLog

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: str,
        actor_id: Optional[int] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_value=old_value,
            new_value=new_value
        )
        db.add(log_entry)
        db.flush()
        return log_entry

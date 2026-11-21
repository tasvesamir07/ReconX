import uuid
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent
from app.models.base import utc_now

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        resource_type: str,
        resource_id: str,
        actor_id: uuid.UUID = None,
        organization_id: uuid.UUID = None,
        decision: str = "allowed",
        reason: str = None,
        ip_address: str = None,
        metadata_json: dict = None
    ) -> AuditEvent:
        event = AuditEvent(
            actor_id=actor_id,
            organization_id=organization_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            decision=decision,
            reason=reason,
            ip_address=ip_address,
            metadata_json=metadata_json or {},
            created_at=utc_now()
        )
        db.add(event)
        db.commit()
        return event

"""
POST /api/alerts/run — trigger alert check manually
GET  /api/alerts     — sent alerts log
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models_sql import Alert, Directive, Case
from services.alert_service import run_alert_check

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.post("/run")
def trigger_alerts(db: Session = Depends(get_db)):
    """
    Manually triggers the Layer 6 Alert System script.
    Checks for upcoming deadlines and dispatches emails.
    """
    result = run_alert_check(db)
    return result


@router.get("")
def get_alert_logs(db: Session = Depends(get_db)):
    """
    Retrieves the log of all sent alerts.
    """
    alerts = (
        db.query(Alert)
        .join(Directive)
        .outerjoin(Case, Directive.case_id == Case.id)
        .order_by(Alert.sent_at.desc())
        .limit(100)
        .all()
    )

    logs = []
    for a in alerts:
        logs.append({
            "id": a.id,
            "directive_id": a.directive_id,
            "case_number": a.directive.case.case_number if a.directive.case else None,
            "department": a.directive.responsible_entity,
            "officer_email": a.officer_email,
            "deadline": a.deadline.isoformat() if a.deadline else None,
            "sent_at": a.sent_at.isoformat() if a.sent_at else None,
            "status": a.status,
        })

    return {"total": len(logs), "alerts": logs}
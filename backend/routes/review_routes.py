"""
Adds PATCH /api/review/{directive_id}/approve|reject|edit
and  GET  /api/review/{case_id}
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from sqlalchemy.orm import Session
from db.database import get_db
from db.models_sql import Directive, ReviewLog, DirectiveFieldConfidence
from services.status_service import approve_directive, reject_directive

router = APIRouter(prefix="/api/review", tags=["review"])


# ── Pydantic request bodies ──────────────────────────────────────────────────

class ApproveRequest(BaseModel):
    reviewer_id: Optional[str] = "default_reviewer"


class EditApproveRequest(BaseModel):
    reviewer_id: Optional[str] = "default_reviewer"
    corrected_value: dict[str, Any]


class RejectRequest(BaseModel):
    reviewer_id: Optional[str] = "default_reviewer"
    rejection_reason: str


# ── Helper: serialize directive for API response ─────────────────────────────

def _serialize_directive(d: Directive) -> dict:
    confidence_fields = {
        fc.field_name: fc.confidence_score
        for fc in (d.confidence_fields or [])
    }
    return {
        "id": d.id,
        "member1_id": d.member1_id,
        "directive_text": d.directive_text,
        "responsible_entity": d.responsible_entity,
        "deadline": d.deadline.isoformat() if d.deadline else None,
        "appeal_flag": d.appeal_flag,
        "ambiguity_flag": d.ambiguity_flag,
        "ambiguity_reason": d.ambiguity_reason,
        "directive_confidence_score": d.directive_confidence_score,
        "source_page": d.source_page,
        "status": d.status,
        "confidence_fields": confidence_fields,
        "action_plan": {
            "status": d.action_plan.status,
            "action": d.action_plan.action,
            "department": d.action_plan.department,
            "timeline_days": d.action_plan.timeline_days,
            "nature": d.action_plan.nature,
            "appeal_consideration": d.action_plan.appeal_consideration,
            "compliance_steps": d.action_plan.compliance_steps,
            "generation_source": d.action_plan.generation_source,             # <-- Sent to UI
            "generation_time_seconds": d.action_plan.generation_time_seconds, # <-- Sent to UI
        } if d.action_plan else None,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/{case_id}")
def get_directives_for_case(case_id: int, db: Session = Depends(get_db)):
    """Return all directives for a case (for the HITL review portal)."""
    directives = (
        db.query(Directive)
        .filter(Directive.case_id == case_id)
        .all()
    )
    if not directives:
        raise HTTPException(status_code=404, detail=f"No directives found for case {case_id}")

    total = len(directives)
    reviewed = sum(1 for d in directives if d.status in ("verified", "rejected"))
    return {
        "case_id": case_id,
        "total": total,
        "reviewed": reviewed,
        "directives": [_serialize_directive(d) for d in directives],
    }


@router.patch("/{directive_id}/approve")
def approve(
    directive_id: int,
    body: ApproveRequest,
    db: Session = Depends(get_db),
):
    """Approve a directive and its action plan."""
    try:
        d = approve_directive(directive_id, body.reviewer_id or "reviewer", db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": "Directive approved", "directive_id": d.id, "status": d.status}


@router.patch("/{directive_id}/edit")
def edit_and_approve(
    directive_id: int,
    body: EditApproveRequest,
    db: Session = Depends(get_db),
):
    """Edit fields then approve a directive. Both original and corrected values are logged."""
    try:
        d = approve_directive(
            directive_id,
            body.reviewer_id or "reviewer",
            db,
            corrected_value=body.corrected_value,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": "Directive edited and approved", "directive_id": d.id, "status": d.status}


@router.patch("/{directive_id}/reject")
def reject(
    directive_id: int,
    body: RejectRequest,
    db: Session = Depends(get_db),
):
    """Reject a directive and log the reason."""
    if not body.rejection_reason.strip():
        raise HTTPException(status_code=422, detail="rejection_reason is required")
    try:
        d = reject_directive(
            directive_id,
            body.reviewer_id or "reviewer",
            body.rejection_reason,
            db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"message": "Directive rejected", "directive_id": d.id, "status": d.status}

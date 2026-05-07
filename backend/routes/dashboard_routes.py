"""
Includes N+1 Query optimizations and exposes case_id for frontend routing.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from db.database import get_db
from db.models_sql import Directive, ReviewLog

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _days_left_label(deadline: Optional[date]) -> str:
    if deadline is None:
        return "No explicit deadline"

    today = date.today()
    delta = (deadline - today).days

    if delta < 0:
        return "❌ Overdue"

    if delta < 3:
        return f"⚠️ {delta} day{'s' if delta != 1 else ''} left"

    if delta <= 7:
        return f"⚡ {delta} days left"

    return f"✅ {delta} days left"


@router.get("")
def get_dashboard(
    department: Optional[str] = Query(
        None,
        description="Filter by department name"
    ),
    status: Optional[str] = Query(
        None,
        description="Filter by status: pending_review|verified|complied|overdue"
    ),
    db: Session = Depends(get_db),
):
    # IMPORTANT FIX:
    # Removed hardcoded `.filter(Directive.status == "verified")`
    # so newly extracted directives actually appear on dashboard.
    query = (
        db.query(Directive)
        .options(
            joinedload(Directive.case),
            joinedload(Directive.action_plan)
        )
    )

    if department:
        query = query.filter(
            Directive.responsible_entity.ilike(f"%{department}%")
        )

    directives = query.all()

    rows = []

    for d in directives:
        ap_status = (
            d.action_plan.status
            if d.action_plan
            else "pending_review"
        )

        if status and ap_status != status:
            continue

        rows.append({
            "id": d.id,
            "case_id": d.case_id,
            "case_number": d.case.case_number if d.case else None,
            "court": d.case.court_name if d.case else None,
            "directive_summary": (
                (d.directive_text or "")[:120]
                + (
                    "..."
                    if len(d.directive_text or "") > 120
                    else ""
                )
            ),
            "department": d.responsible_entity,
            "deadline": (
                d.deadline.isoformat()
                if d.deadline
                else None
            ),
            "days_left_label": _days_left_label(d.deadline),
            "status": ap_status,
            "appeal_flag": d.appeal_flag,
            "confidence_score": d.directive_confidence_score,
        })

    return {
        "total": len(rows),
        "directives": rows
    }


class StatusUpdateRequest(BaseModel):
    status: str
    reviewer_id: Optional[str] = "officer"


@router.patch("/{directive_id}/status")
def update_compliance_status(
    directive_id: int,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    allowed = {"complied", "verified", "overdue"}

    if body.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of {allowed}"
        )

    directive = (
        db.query(Directive)
        .filter(Directive.id == directive_id)
        .first()
    )

    if not directive:
        raise HTTPException(
            status_code=404,
            detail=f"Directive {directive_id} not found"
        )

    if directive.action_plan:
        original_status = directive.action_plan.status

        directive.action_plan.status = body.status

        log = ReviewLog(
            directive_id=directive_id,
            reviewer_id=body.reviewer_id,
            action=f"status_update:{body.status}",
            original_value={
                "action_plan_status": original_status
            },
            corrected_value={
                "action_plan_status": body.status
            },
        )

        db.add(log)
        db.commit()

    return {
        "message": f"Status updated to '{body.status}'",
        "directive_id": directive_id,
    }


"""
Handles status transitions via clean relationship access.
"""

from __future__ import annotations

from typing import Optional, Dict
from db.models_sql import Case, Directive, DirectiveStatus, ReviewLog


def _get_directive_or_raise(directive_id: int, db) -> Directive:
    d = db.query(Directive).filter(Directive.id == directive_id).first()
    if not d:
        raise ValueError(f"Directive {directive_id} not found")
    return d


def approve_directive(directive_id: int, reviewer_id: str, db, corrected_value: Optional[Dict] = None) -> Directive:
    try:
        directive = _get_directive_or_raise(directive_id, db)

        original = {
            "directive_text": directive.directive_text,
            "responsible_entity": directive.responsible_entity,
            "deadline": directive.deadline.isoformat() if directive.deadline else None,
            "appeal_flag": directive.appeal_flag,
        }

        action = "approved"
        if corrected_value:
            action = "edited"
            if "directive_text" in corrected_value:
                directive.directive_text = corrected_value["directive_text"]
            if "responsible_entity" in corrected_value:
                directive.responsible_entity = corrected_value["responsible_entity"]
            if "deadline" in corrected_value:
                from datetime import date
                try:
                    directive.deadline = date.fromisoformat(corrected_value["deadline"])
                except (ValueError, TypeError):
                    pass
            if "appeal_flag" in corrected_value:
                directive.appeal_flag = bool(corrected_value["appeal_flag"])

        directive.status = DirectiveStatus.VERIFIED.value

        
        if directive.action_plan:
            directive.action_plan.status = DirectiveStatus.VERIFIED.value

        log = ReviewLog(
            directive_id=directive_id,
            reviewer_id=reviewer_id or "system",
            action=action,
            original_value=original,
            corrected_value=corrected_value,
        )
        db.add(log)

        db.flush()
        _maybe_close_case(directive.case_id, db)
        db.commit()
        db.refresh(directive)
        return directive

    except ValueError:
        raise
    except Exception:
        db.rollback()
        raise


def reject_directive(directive_id: int, reviewer_id: str, rejection_reason: str, db) -> Directive:
    try:
        directive = _get_directive_or_raise(directive_id, db)

        original = {
            "directive_text": directive.directive_text,
            "responsible_entity": directive.responsible_entity,
            "deadline": directive.deadline.isoformat() if directive.deadline else None,
        }

        directive.status = DirectiveStatus.REJECTED.value

        
        if directive.action_plan:
            directive.action_plan.status = DirectiveStatus.REJECTED.value

        log = ReviewLog(
            directive_id=directive_id,
            reviewer_id=reviewer_id or "system",
            action="rejected",
            original_value=original,
            corrected_value=None,
            rejection_reason=rejection_reason,
        )
        db.add(log)
        db.commit()
        db.refresh(directive)
        return directive

    except ValueError:
        raise
    except Exception:
        db.rollback()
        raise


def _maybe_close_case(case_id: int, db) -> None:
    remaining = (
        db.query(Directive)
        .filter(Directive.case_id == case_id, Directive.status == DirectiveStatus.PENDING.value)
        .count()
    )
    if remaining == 0:
        case = db.query(Case).filter(Case.id == case_id).first()
        if case:
            case.status = "verified"

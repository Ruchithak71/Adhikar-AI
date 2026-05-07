"""
Includes deterministic timeline propagation to Layer 3.
"""

from datetime import date
from db.models_sql import (
    ActionPlan,
    Case,
    Directive,
    DirectiveFieldConfidence,
)
from services.action_plan_service import generate_action_plan

def save_case_to_db(normalized_data, db):
    try:
        case = Case(
            case_number=normalized_data.get("case_id", "UNKNOWN_CASE"),
            court_name=normalized_data.get("court"),
            date_of_order=normalized_data.get("date_of_order"),
            pdf_path=normalized_data.get("pdf_path"),
            source="mock_api",
            status="pending_review",
        )
        db.add(case)
        db.flush()

        for d in normalized_data.get("directives", []):
            if not d.get("directive_text"):
                continue

            directive = Directive(
                case_id=case.id,
                directive_text=d.get("directive_text"),
                responsible_entity=d.get("responsible_entity"),
                deadline=d.get("deadline_resolved"),
                appeal_flag=d.get("appeal_flag", False),
                ambiguity_flag=d.get("ambiguity_flag", False),
                ambiguity_reason=d.get("ambiguity_reason"),
                directive_confidence_score=d.get("confidence", {}).get("overall"),
                source_page=d.get("source_page"),
                status="pending",
            )
            db.add(directive)
            db.flush()

            confidence = d.get("confidence", {})
            for field_name, score in confidence.items():
                field_conf = DirectiveFieldConfidence(
                    directive_id=directive.id,
                    field_name=field_name,
                    confidence_score=score,
                )
                db.add(field_conf)

            
            timeline_days = 30
            deadline_str = d.get("deadline_resolved")
            if deadline_str:
                try:
                    target_date = date.fromisoformat(deadline_str)
                    timeline_days = max(1, (target_date - date.today()).days)
                except (ValueError, TypeError):
                    pass

            llm_plan = generate_action_plan(
                directive_text=d.get("directive_text"),
                department=d.get("responsible_entity"),
                appeal_flag=d.get("appeal_flag", False),
                timeline_days=timeline_days  # Correctly passed!
            )

            action_plan = ActionPlan(
                directive_id=directive.id,
                action=llm_plan.get("action"),
                department=llm_plan.get("department"),
                timeline_days=llm_plan.get("timeline_days"),
                nature=llm_plan.get("nature"),
                appeal_consideration=llm_plan.get("appeal_consideration"),
                compliance_steps=llm_plan.get("compliance_steps"),
                generation_source=llm_plan.get("generation_source"),
                generation_time_seconds=llm_plan.get("generation_time_seconds"),
                status="pending_review",
            )
            db.add(action_plan)

        db.commit()
        return case
    except Exception:
        db.rollback()
        raise

"""
Queries for upcoming deadlines and dispatches emails via Resend.
"""

import os
import logging
from datetime import date, timedelta, datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from db.models_sql import Directive, Case, ActionPlan, Alert

# Graceful fallback if Resend isn't installed yet
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

logger = logging.getLogger(__name__)

# Config from environment
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

# Resend Strict Requirement: Until you verify a custom domain, you MUST use their testing email.
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "onboarding@resend.dev")
DEMO_OFFICER_EMAIL = os.getenv("DEMO_OFFICER_EMAIL", "officer@example.com")

# Initialize the Resend client globally if the key exists
if RESEND_API_KEY and RESEND_AVAILABLE:
    resend.api_key = RESEND_API_KEY


def run_alert_check(db: Session) -> Dict[str, Any]:
    """
    Finds verified, uncomplied directives with a deadline <= 7 days away.
    Sends an email alert and logs it to the database.
    """
    today = date.today()
    target_date = today + timedelta(days=7)

    # LOGIC FROM PDF: 
    # verified directives WHERE deadline <= today + 7 days AND status != complied
    target_directives = (
        db.query(Directive)
        .join(ActionPlan)
        .filter(Directive.status == "verified")
        .filter(Directive.deadline != None)
        .filter(Directive.deadline <= target_date)
        .filter(ActionPlan.status != "complied")
        .all()
    )

    alerts_sent = 0
    skipped = 0

    for directive in target_directives:
        # Check if we already sent an alert for this directive today to prevent spam
        already_sent_today = (
            db.query(Alert)
            .filter(Alert.directive_id == directive.id)
            .filter(Alert.sent_at >= today)
            .first()
        )
        if already_sent_today:
            skipped += 1
            continue

        days_remaining = (directive.deadline - today).days
        case_number = directive.case.case_number if directive.case else "Unknown Case"
        department = directive.responsible_entity or "Unknown Department"
        action_text = directive.action_plan.action if directive.action_plan else "Review directive"

        # Construct Email (Exact format from PDF)
        subject = f"❗️ Action Required: [{case_number}]"
        body = f"""
Directive: {directive.directive_text}
Department: {department}
Deadline: {directive.deadline.isoformat()}
Days Remaining: {days_remaining}

Action Required: {action_text}

Link: /dashboard
        """.strip()

        # Send Email
        success = _send_email(to_email=DEMO_OFFICER_EMAIL, subject=subject, body=body)

        # Log to Database
        alert_log = Alert(
            directive_id=directive.id,
            officer_email=DEMO_OFFICER_EMAIL,
            sent_at=datetime.now(),
            deadline=directive.deadline,
            status="sent" if success else "failed_or_simulated"
        )
        db.add(alert_log)
        alerts_sent += 1

    db.commit()
    
    return {
        "message": "Alert check completed",
        "alerts_sent": alerts_sent,
        "skipped_already_sent": skipped,
        "targets_found": len(target_directives)
    }


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Dispatches the email via Resend, with a simulated fallback for dev."""
    if not RESEND_AVAILABLE or not RESEND_API_KEY:
        logger.info(f"SIMULATED EMAIL to {to_email} | Subject: {subject} | Body: {body[:30]}...")
        return False

    # Standard Resend payload structure for sending plain text emails
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    
    try:
        response = resend.Emails.send(params)
        # Resend returns a dict containing the 'id' of the sent email on success
        if "id" in response:
            logger.info(f"Email sent successfully via Resend. ID: {response['id']}")
            return True
        return False
    except Exception as e:
        logger.error(f"Resend API Error: {e}")
        return False

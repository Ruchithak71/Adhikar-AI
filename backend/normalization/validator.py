

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

_ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_directive(directive: dict[str, Any]) -> bool:
    """
    Validate a normalized directive dict.
    Returns True if valid, False if not.
    """
    if not directive.get("directive_text"):
        return False

    if "confidence" not in directive:
        return False

    for _, score in directive["confidence"].items():
        if not isinstance(score, (float, int)):
            return False
        if score < 0 or score > 1:
            return False

    source_page = directive.get("source_page")
    if source_page is not None:
        if not isinstance(source_page, int) or source_page <= 0:
            return False

    deadline = directive.get("deadline_resolved")
    if deadline:
        if not _ISO_RE.match(str(deadline)):
            return False

    return True


def validate_and_flag(directive: dict[str, Any]) -> dict[str, Any]:
    """
    Validate a directive dict.
    If invalid, sets ambiguity_flag=True and appends reasons to ambiguity_reason.
    Always returns the (possibly modified) dict — never raises.
    """
    if not validate_directive(directive):
        directive["ambiguity_flag"] = True
        existing = directive.get("ambiguity_reason") or ""
        directive["ambiguity_reason"] = (
            existing + " Directive failed structural validation; sent to reviewer queue."
        ).strip()
    return directive

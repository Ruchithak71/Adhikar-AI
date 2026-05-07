import re
from datetime import date, timedelta
from typing import Optional

_WORD_TO_INT = {
    "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8,
}

_WEEKS_RE  = re.compile(r"within\s+(\d+|one|two|three|four|five|six|seven|eight)\s+weeks?",  re.IGNORECASE)
_MONTHS_RE = re.compile(r"within\s+(\d+|one|two|three|four|five|six)\s+months?",             re.IGNORECASE)
_DAYS_RE   = re.compile(r"within\s+(\d+|one|two|three|four|five|six|seven)\s+days?",         re.IGNORECASE)
_IMMEDIATELY_RE = re.compile(r"\bimmediately\b|\bforthwith\b|\bat once\b",                    re.IGNORECASE)
_ISO_RE    = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _to_int(value: str) -> int:
    return _WORD_TO_INT.get(value.lower(), int(value))


def standardize_deadline(raw_deadline: Optional[str], today: Optional[date] = None) -> Optional[str]:
    """
    Convert a raw deadline string into a resolved ISO date string (YYYY-MM-DD).

    Rules (from architecture doc):
      "within X weeks"  → today + (X × 7) days
      "within X months" → today + (X × 30) days
      "within X days"   → today + X days
      "immediately"     → today + 7 days
      Already YYYY-MM-DD → keep as is
      null / empty       → returns None
    """
    if not raw_deadline or not raw_deadline.strip():
        return None

    raw = raw_deadline.strip()
    base = today or date.today()

    # Already ISO
    if _ISO_RE.match(raw):
        return raw

    # "immediately" / "forthwith"
    if _IMMEDIATELY_RE.search(raw):
        return (base + timedelta(days=7)).isoformat()

    # "within X weeks"
    m = _WEEKS_RE.search(raw)
    if m:
        return (base + timedelta(days=_to_int(m.group(1)) * 7)).isoformat()

    # "within X months"
    m = _MONTHS_RE.search(raw)
    if m:
        return (base + timedelta(days=_to_int(m.group(1)) * 30)).isoformat()

    # "within X days"
    m = _DAYS_RE.search(raw)
    if m:
        return (base + timedelta(days=_to_int(m.group(1)))).isoformat()

    # Cannot parse — return None, let reviewer handle
    return None


# Alias so both naming conventions work
standardize_date = standardize_deadline

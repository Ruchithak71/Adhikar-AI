

import re
from typing import Optional, Tuple
from normalization.dept_map import DEPT_MAP


def _clean(raw: str) -> str:
    """Lowercase, strip punctuation and extra spaces."""
    raw = raw.lower()
    raw = re.sub(r"[^\w\s]", " ", raw)
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw


def resolve_entity(raw_entity: Optional[str]) -> Tuple[Optional[str], bool]:
    """
    Resolve a raw entity string to a canonical government department name.

    Returns:
        (resolved_name, ambiguity_flag)
        - resolved_name: canonical name if matched, else original (never a tuple)
        - ambiguity_flag: True if no match found (reviewer should check)
    """
    if not raw_entity or not raw_entity.strip():
        return None, True

    cleaned = _clean(raw_entity)

    # Exact match
    if cleaned in DEPT_MAP:
        return DEPT_MAP[cleaned], False

    # Partial / substring match
    for key, canonical in DEPT_MAP.items():
        if key in cleaned:
            return canonical, False

    # No match — return original string, flag for reviewer
    return raw_entity.strip(), True

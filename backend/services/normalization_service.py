from __future__ import annotations
from typing import Any
from normalization.entity_resolution import resolve_entity
from normalization.date_standardizer import standardize_deadline
from normalization.validator import validate_and_flag


def normalize_extraction(raw_extraction: dict[str, Any]) -> dict[str, Any]:
    """
    Full pipeline:
      1. Resolve department entity names
      2. Standardize dates
      3. Validate each directive

    Args:
        raw_extraction: The 100% compliant dict returned by Layer 2 (extraction_service)

    Returns:
        Normalized case dict ready for DB insertion via save_case_to_db().
    """
    normalized_directives = []
    
    for directive in raw_extraction.get("directives", []):

        # Step 1 — Entity Resolution
        raw_entity = directive.get("responsible_entity")
        resolved_entity, ambiguous = resolve_entity(raw_entity)
        directive["responsible_entity"] = resolved_entity
        if ambiguous and not directive.get("ambiguity_flag"):
            directive["ambiguity_flag"] = True
            directive["ambiguity_reason"] = (
                (directive.get("ambiguity_reason") or "") +
                f" Entity '{raw_entity}' could not be resolved to a known department."
            ).strip()

        # Step 2 — Date Standardization
        raw_deadline = directive.get("deadline_raw")
        directive["deadline_resolved"] = standardize_deadline(raw_deadline)

        # Step 3 — Validation + flag
        directive = validate_and_flag(directive)

        normalized_directives.append(directive)

    raw_extraction["directives"] = normalized_directives
    
    # Ensure source is labeled correctly for the DB
    raw_extraction["source"] = "mock_api" if "mock_pdfs" in str(raw_extraction.get("pdf_path")) else "upload"
    
    return raw_extraction

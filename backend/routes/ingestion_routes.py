
"""
Synchronous ingestion pipeline with clean session resets for demo stability.
"""

import os
import shutil

from fastapi import APIRouter, HTTPException, UploadFile, File

from db.database import SessionLocal
from db.models_sql import ReviewLog, ActionPlan, Directive, Case

from services.extraction_service import run_extraction
from services.normalization_service import normalize_extraction
from services.db_service import save_case_to_db

router = APIRouter(tags=["ingestion"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MOCK_CIS_CASES = [
    {
        "id": "WP-1234-2024",
        "court": "Karnataka High Court",
        "date": "2024-05-01",
        "pdf_path": "mock_pdfs/case1.pdf"
    },
    {
        "id": "PIL-56-2023",
        "court": "Supreme Court of India",
        "date": "2023-11-15",
        "pdf_path": "mock_pdfs/case2.pdf"
    },
    {
        "id": "WA-890-2024",
        "court": "Bombay High Court",
        "date": "2024-02-20",
        "pdf_path": "mock_pdfs/case3.pdf"
    },
    {
        "id": "WP-445-2024",
        "court": "Delhi High Court",
        "date": "2024-04-10",
        "pdf_path": "mock_pdfs/case4.pdf"
    },
    {
        "id": "OS-112-2023",
        "court": "Madras High Court",
        "date": "2023-09-05",
        "pdf_path": "mock_pdfs/case5.pdf"
    },
]


def _process_pipeline(pdf_path: str):
    """
    Unified synchronous ingestion pipeline:
    Extraction -> Normalization -> Action Plans -> DB Persistence

    Demo behavior:
    Clears previous session data before processing new case.
    """

    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # RESET PREVIOUS DEMO SESSION
        # Prevents stale dashboard/review data and duplicate keys.
        # ---------------------------------------------------------
        db.query(ReviewLog).delete()
        db.query(ActionPlan).delete()
        db.query(Directive).delete()
        db.query(Case).delete()

        db.commit()

        # ---------------------------------------------------------
        # RUN EXTRACTION PIPELINE
        # ---------------------------------------------------------
        raw_extraction = run_extraction(pdf_path)

        normalized_data = normalize_extraction(raw_extraction)

        save_case_to_db(normalized_data, db)

        print("PIPELINE SUCCESS: Extraction and persistence completed.")

    except Exception as e:
        db.rollback()

        print(f"PIPELINE ERROR: {e}")

        raise e

    finally:
        db.close()


@router.get("/api/mock-cis/cases")
def list_mock_cases():
    return {
        "total": len(MOCK_CIS_CASES),
        "cases": MOCK_CIS_CASES
    }


@router.post("/api/extract/{case_id}")
def trigger_mock_extraction(case_id: str):
    """
    Trigger synchronous extraction for a mock CIS case.
    """

    target_case = next(
        (c for c in MOCK_CIS_CASES if c["id"] == case_id),
        None
    )

    if not target_case:
        raise HTTPException(
            status_code=404,
            detail="Mock case not found"
        )

    _process_pipeline(target_case["pdf_path"])

    return {
        "message": f"Extraction completed for {case_id}",
        "status": "completed"
    }


@router.post("/api/cases/upload")
def upload_and_process_pdf(file: UploadFile = File(...)):
    """
    Upload and synchronously process a PDF.
    """

    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    _process_pipeline(file_path)

    return {
        "message": "File uploaded and extraction completed successfully.",
        "file_path": file_path,
        "status": "completed"
    }


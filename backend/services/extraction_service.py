"""
Includes token limit truncation for stability.
"""

import os
import json
import time
import logging
import fitz  # PyMuPDF
import google.generativeai as genai
from typing import Dict, Any

logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

MODEL_NAME = "gemini-2.5-flash"
MAX_RETRIES = 3

SYSTEM_PROMPT = """
You are a legal document extraction AI. Extract the core case details and all compliance directives from the provided court document text.

You MUST return ONLY a valid JSON object matching this exact structure:
{
  "case_id": "string",
  "court": "string",
  "date_of_order": "YYYY-MM-DD",
  "directives": [
    {
      "directive_text": "string",
      "responsible_entity": "string or null",
      "deadline_raw": "string or null",
      "deadline_resolved": null,
      "appeal_flag": boolean,
      "ambiguity_flag": boolean,
      "ambiguity_reason": "string or null",
      "source_page": integer,
      "confidence": {
        "directive_text": float (0.0 to 1.0),
        "responsible_entity": float (0.0 to 1.0),
        "deadline": float (0.0 to 1.0),
        "overall": float (0.0 to 1.0)
      }
    }
  ]
}
Do not include markdown blocks. Do not invent details not present in the text.
"""

def extract_text_from_pdf(pdf_path: str) -> str:
    """Uses PyMuPDF to extract text. Hard cap at 50 pages as per PDF spec."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page_num, page in enumerate(doc):
            if page_num >= 50: 
                break
            text += f"\n\n--- PAGE {page_num + 1} ---\n\n"
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        logger.error(f"PyMuPDF failed to read {pdf_path}: {e}")
        raise ValueError(f"Failed to parse PDF: {e}")

def run_extraction(pdf_path: str) -> Dict[str, Any]:
    text = extract_text_from_pdf(pdf_path)
    
    # ELITE UPGRADE: Truncate gigantic docs to prevent Gemini token explosion
    text = text[:150000]
    
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")

    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SYSTEM_PROMPT,
        generation_config={"response_mime_type": "application/json"}
    )

    prompt = f"Extract the structured data from the following court document:\n\n{text}"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = model.generate_content(prompt, request_options={"timeout": 60.0})
            data = json.loads(response.text)
            data["pdf_path"] = pdf_path
            return data
        except Exception as e:
            logger.error(f"Extraction failed on attempt {attempt}: {e}")
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"Extraction failed after 3 attempts: {e}")
            time.sleep(2)

    return {}

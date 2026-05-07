# AdhikarAI

> From Court Judgments to Verified Government Action Plans

AdhikarAI is an AI-assisted judicial compliance workflow system that transforms unstructured court judgment PDFs into structured, human-verified action plans — enabling government departments to track and execute court directives efficiently, transparently, and accountably.

Built for **AI for Bharat Hackathon 2026 — Theme 11**.

---

## The Problem

India's High Courts dispose thousands of judgments every year. Each judgment contains critical directives — who must act, by when, and what the consequences are. Today, these directives are buried in lengthy PDF documents, manually read by officials, and frequently missed or misinterpreted — leading to missed deadlines, fragmented accountability, and contempt of court risks.

**AdhikarAI doesn't just read judgments — it ensures they are executed.**

---

## How It Works

```
Court Judgment PDF
        ↓
AI Extraction — directives, entities, deadlines, confidence scores
        ↓
Normalization — entity resolution, date standardization
        ↓
Action Plan Generation — compliance steps per directive
        ↓
Human Review — approve, edit, or reject with source verification
        ↓
Trusted Dashboard — verified directives tracked to completion
```

---

## Key Features

### Ingestion
- Mock Court CIS API simulation for realistic demo flow
- Manual PDF upload support
- Handles both digital and scanned court judgments

### AI Extraction
- Extracts directives, responsible entities, deadlines, and timelines
- Confidence scoring per extracted field
- Source page mapping for reviewer verification
- Ambiguity detection with explainable flags

### Normalization
- Deterministic government department name resolution
- Natural language deadline parsing into structured dates
- Validation and structure checks before action plan generation

### Action Plan Generation
- AI-generated compliance steps per directive
- Appeal-aware logic — freezes directives under active appeal
- Structured output: action, department, timeline, nature, steps

### Human-in-the-Loop Review Portal
- Split-screen interface: original PDF on the left, extracted data on the right
- PDF auto-scrolls to source page of each directive
- Color-coded confidence indicators per field
- Reviewers can Approve, Edit, or Reject each directive
- Only verified records proceed to the dashboard
- Full audit logging of every reviewer action

### Trusted Dashboard
- Displays only human-verified action plans
- Deadline urgency indicators with days remaining
- Compliance status tracking per directive
- Search, filter, and sort by department and status
- Officer status write-back with audit trail

---

## Demo Flow

1. Open the Mock CIS API — select a preloaded court case
2. Trigger extraction — Gemini processes the full judgment
3. Open the HITL Review Portal — review directives with PDF source
4. Approve, edit, or reject each directive
5. Open the Trusted Dashboard — track verified directives to completion

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy, Alembic |
| AI | Gemini 3.1 Pro |
| PDF Processing | PyMuPDF, PDF.js |
| Database | PostgreSQL |

---

## Project Structure

```text
adhikar-ai/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── tailwind.config.ts
│
└── backend/
    ├── alembic/
    ├── db/
    ├── mock_pdfs/
    ├── normalization/
    ├── routes/
    ├── services/
    ├── main.py
    └── requirements.txt
```

---

## Setup

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside the backend folder:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/adhikarai
GEMINI_API_KEY=your_gemini_api_key
```

Run database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8001
```

Start the frontend:

```bash
npm run dev
```

Frontend → `http://localhost:3000`
Backend → `http://127.0.0.1:8001`

---

## API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/mock-cis/cases` | List preloaded mock court cases |
| POST | `/api/cases/upload` | Upload a judgment PDF manually |
| POST | `/api/extract/:case_id` | Trigger AI extraction |
| GET | `/api/review/:case_id` | Get directives for review |
| PATCH | `/api/review/:directive_id/approve` | Approve directive |
| PATCH | `/api/review/:directive_id/edit` | Edit and approve directive |
| PATCH | `/api/review/:directive_id/reject` | Reject directive |
| GET | `/api/dashboard` | Get verified directives |
| PATCH | `/api/dashboard/:id/status` | Update compliance status |
| POST | `/api/alerts/run` | Trigger deadline alert check |

---

## Design Principles

- **Human-first** — AI extracts, humans verify. No directive reaches the dashboard without reviewer approval.
- **Explainable** — every extraction is traceable to its source page in the original judgment.
- **Auditable** — every reviewer action is logged with timestamp and user.
- **Reversible** — reviewers can edit or reject at any point before approval.
- **Deterministic where possible** — normalization and date parsing use rules, not AI guesswork.

---

## Roadmap

- Real CIS/DOMS API integration
- Character-level PDF source highlighting
- Celery + Redis async job queues
- Government department registry database
- Automated deadline alert scheduling
- Regional language support (Kannada, Tamil, Telugu)
- Cloud storage integration

---

## License

Built for academic and prototype demonstration purposes — AI for Bharat Hackathon 2026.

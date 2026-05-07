"""
Registers all layers (Ingestion -> Extraction -> Review -> Dashboard -> Alerts).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import init_db

# Import all routers
from routes.ingestion_routes import router as ingestion_router
from routes.review_routes import router as review_router
from routes.dashboard_routes import router as dashboard_router
from routes.alert_routes import router as alert_router

app = FastAPI(
    title="AdhikarAI — Full Backend Pipeline",
    description="Layer 1 through 6: Ingestion, Extraction, Normalization, Action Plans, HITL, and Alerts.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(ingestion_router)
app.include_router(review_router)
app.include_router(dashboard_router)
app.include_router(alert_router)


@app.on_event("startup")
def on_startup():
    """Create all tables on startup if they don't exist."""
    init_db()


@app.get("/")
def home():
    return {"message": "AdhikarAI Full Backend API running successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

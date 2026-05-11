from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import action_items, ai, audits, auth, dashboard, reports, users
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AuditFlow API",
    description="Intelligente Audit- & Compliance-Plattform für KMUs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(audits.router, prefix="/api/v1")
app.include_router(action_items.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "AuditFlow API"}

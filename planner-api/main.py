"""
main.py — Railway AI Block Planner API
Entrypoint: uvicorn main:app --reload
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.planning import router as planning_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Railway AI Block Planner API",
    description=(
        "Automated block planning engine for Salem Division — Southern Railway. "
        "Generates conflict-checked maintenance block recommendations using "
        "constraint checking, priority scoring, and coordination optimization."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS — allow the Next.js frontend ───────────────────────────────────────

cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [o.strip() for o in cors_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(planning_router)

# ─── Root ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["root"])
def root():
    return {
        "service":     "Railway AI Block Planner API",
        "version":     "1.0.0",
        "division":    "Salem Division — Southern Railway",
        "docs":        "/docs",
        "health":      "/api/planning/health",
        "endpoints": {
            "requests":   "GET  /api/planning/requests",
            "plans":      "GET  /api/planning/plans",
            "blocks":     "GET  /api/planning/blocks",
            "corridors":  "GET  /api/planning/corridors",
            "trains":     "GET  /api/planning/trains",
            "run":        "POST /api/planning/run",
            "approve":    "POST /api/planning/plans/{plan_id}/approve",
            "reject":     "POST /api/planning/plans/{plan_id}/reject",
        },
    }

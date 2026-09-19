import os
import sys
import types

# Ensure paths and modules resolve whether running from repo root or backend/ directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) # .../app
BACKEND_DIR = os.path.dirname(CURRENT_DIR)               # .../backend
REPO_DIR = os.path.dirname(BACKEND_DIR)                 # .../repo

for p in [REPO_DIR, BACKEND_DIR, CURRENT_DIR]:
    if p and p not in sys.path:
        sys.path.insert(0, p)

if "backend" not in sys.modules:
    try:
        import backend
    except ModuleNotFoundError:
        try:
            import app
            backend_mod = types.ModuleType("backend")
            backend_mod.app = app
            sys.modules["backend"] = backend_mod
            sys.modules["backend.app"] = app
        except Exception:
            pass

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.services.seed_service import seed_database
from backend.app.api.auth import router as auth_router
from backend.app.api.users import router as users_router
from backend.app.api.matches import router as matches_router
from backend.app.api.teams import router as teams_router
from backend.app.api.leaderboard import router as leaderboard_router
from backend.app.api.ratings import router as ratings_router
from backend.app.api.admin import router as admin_router
from backend.app.api.super_admin import router as super_admin_router
from backend.app.api.seasons import router as seasons_router
from backend.app.api.reports import router as reports_router
from backend.app.api.achievements import router as achievements_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
    except Exception:
        pass

    print("[STARTUP] Starting PSO Gaming Platform API...", flush=True)
    try:
        print("[STARTUP] Initializing database schema...", flush=True)
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            try:
                from sqlalchemy import text
                conn.execute(text("ALTER TABLE match_results ADD COLUMN IF NOT EXISTS notes TEXT;"))
            except Exception as e:
                print(f"[STARTUP] Migration note: {e}", flush=True)

        print("[STARTUP] Seeding database defaults...", flush=True)
        db = SessionLocal()
        try:
            seed_database(db)
            print("[STARTUP] Database seed complete!", flush=True)
        finally:
            db.close()
    except Exception as exc:
        print(f"[STARTUP ERROR] Database initialization notice: {exc}", flush=True)
        print("[STARTUP] Continuing server startup...", flush=True)

    print("[STARTUP] Server is live and ready to accept requests!", flush=True)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Internal office competitive gaming platform API for FC football matches",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app" if not allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory for proof/avatars
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(matches_router, prefix=settings.API_V1_STR)
app.include_router(teams_router, prefix=settings.API_V1_STR)
app.include_router(leaderboard_router, prefix=settings.API_V1_STR)
app.include_router(ratings_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(super_admin_router, prefix=settings.API_V1_STR)
app.include_router(seasons_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(achievements_router, prefix=settings.API_V1_STR)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "platform": "PSO Gaming Platform", "version": "1.0.0"}

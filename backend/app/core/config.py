import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Find and load .env file
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
workspace_root = os.path.dirname(backend_root)

for env_path in [os.path.join(backend_root, ".env"), os.path.join(workspace_root, ".env"), ".env"]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "PSO Gaming Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "pso-super-secret-jwt-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pso_gaming.db")
    
    # Supabase optional configuration
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", None)
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", None)
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "pso-evidence")

    # Uploads storage directory (fallback or local)
    UPLOAD_DIR: str = os.path.join(backend_root, "uploads")

    # Elo defaults
    DEFAULT_K_FACTOR: int = 24
    DEFAULT_HANDICAP_MULTIPLIER: int = 5
    MAX_HANDICAP: int = 150

    class Config:
        case_sensitive = True
        extra = "ignore"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

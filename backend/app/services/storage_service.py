import os
import shutil
import uuid
import httpx
import logging
from typing import Tuple, Optional
from datetime import datetime
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.models import SystemSetting

logger = logging.getLogger(__name__)

DEFAULT_SCREENSHOT_SIZE_KB = 5000  # Default 5 MB (accommodates high-res mobile photos and screenshots)
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}

class StorageService:
    @classmethod
    def get_max_screenshot_size_kb(cls, db: Optional[Session] = None) -> int:
        if db is not None:
            try:
                setting = db.query(SystemSetting).filter(SystemSetting.key == "max_screenshot_size_kb").first()
                if setting and setting.value:
                    val = int(setting.value)
                    if 30 <= val <= 10240:
                        return val
            except Exception as e:
                logger.warning(f"Could not read max_screenshot_size_kb setting: {e}")
        return DEFAULT_SCREENSHOT_SIZE_KB

    @classmethod
    def validate_screenshot(cls, file: UploadFile, content: bytes, max_size_kb: int = DEFAULT_SCREENSHOT_SIZE_KB):
        """
        Validates that the uploaded screenshot conforms strictly to security and size constraints:
        1. Content-Type must be JPG, PNG, or WEBP.
        2. Size must NOT exceed configured max_size_kb (e.g. 100 KB).
        """
        # Validate MIME type
        content_type = file.content_type.lower() if file.content_type else ""
        ext = os.path.splitext(file.filename or "")[1].lower()
        
        valid_ext = ext in [".jpg", ".jpeg", ".png", ".webp"]
        valid_mime = content_type in ALLOWED_IMAGE_TYPES or "image" in content_type
        
        if not (valid_ext and valid_mime):
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Allowed formats: JPG, PNG, WEBP."
            )

        # Validate dynamic size limit
        file_size = len(content)
        max_bytes = max_size_kb * 1024
        if file_size > max_bytes:
            size_kb = round(file_size / 1024, 1)
            raise HTTPException(
                status_code=400,
                detail=f"Image must be {max_size_kb} KB or smaller. Uploaded size: {size_kb} KB. Please select another screenshot or compress client-side."
            )

    @classmethod
    def save_screenshot(cls, file: UploadFile, match_id: int, db: Optional[Session] = None) -> Tuple[str, str]:
        """
        Validates and saves a match screenshot with structured naming:
        screenshots/{match_id}/{unique_id}.webp (or original extension).
        """
        file.file.seek(0)
        content = file.file.read()
        
        max_limit_kb = cls.get_max_screenshot_size_kb(db)
        cls.validate_screenshot(file, content, max_size_kb=max_limit_kb)
        
        unique_id = uuid.uuid4().hex[:12]
        ext = os.path.splitext(file.filename or "")[1].lower()
        if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".webp"
            
        object_name = f"screenshots/{match_id}/{unique_id}{ext}"
        local_filename = f"screenshots_{match_id}_{unique_id}{ext}"
        
        # 1. Try Supabase Storage if configured
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                bucket = settings.SUPABASE_BUCKET or "pso-evidence"
                upload_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{object_name}"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                    "apikey": settings.SUPABASE_KEY,
                    "Content-Type": file.content_type or "image/webp",
                    "x-upsert": "true"
                }
                
                with httpx.Client(timeout=4.0) as client:
                    response = client.post(upload_url, headers=headers, content=content)
                    if response.status_code in [200, 201]:
                        public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{object_name}"
                        logger.info(f"Successfully uploaded screenshot to Supabase: {public_url}")
                        return public_url, "supabase"
                    else:
                        logger.warning(f"Supabase upload returned status {response.status_code}: {response.text}. Falling back to local storage.")
            except Exception as e:
                logger.warning(f"Failed to upload screenshot to Supabase: {str(e)}. Falling back to local storage.")
            finally:
                file.file.seek(0)

        # 2. Local Storage Fallback
        file_path = os.path.join(settings.UPLOAD_DIR, local_filename)
        with open(file_path, "wb") as buffer:
            buffer.write(content)
            
        file_url = f"/uploads/{local_filename}"
        return file_url, "local"

    @staticmethod
    def save_file(file: UploadFile, prefix: str = "evidence") -> Tuple[str, str]:
        """
        Generic file saver (used for user avatars or general uploads).
        """
        clean_filename = f"{prefix}_{int(datetime.utcnow().timestamp())}_{file.filename}"
        
        # 1. Try Supabase Storage if configured
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                file.file.seek(0)
                content = file.file.read()
                
                bucket = settings.SUPABASE_BUCKET or "pso-evidence"
                upload_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{clean_filename}"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                    "apikey": settings.SUPABASE_KEY,
                    "Content-Type": file.content_type or "application/octet-stream",
                }
                
                with httpx.Client(timeout=4.0) as client:
                    response = client.post(upload_url, headers=headers, content=content)
                    if response.status_code in [200, 201]:
                        public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{clean_filename}"
                        logger.info(f"Successfully uploaded file to Supabase: {public_url}")
                        return public_url, "supabase"
                    else:
                        logger.warning(f"Supabase upload returned status {response.status_code}: {response.text}. Falling back to local storage.")
            except Exception as e:
                logger.warning(f"Failed to upload to Supabase: {str(e)}. Falling back to local storage.")
            finally:
                file.file.seek(0)

        # 2. Local Storage Fallback
        file_path = os.path.join(settings.UPLOAD_DIR, clean_filename)
        file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"/uploads/{clean_filename}"
        return file_url, "local"

    @staticmethod
    def delete_file(file_url: str) -> bool:
        """
        Deletes a file either from Supabase Storage or local storage.
        Safe execution: handles errors gracefully so failures do not interrupt critical database flow.
        """
        if not file_url or file_url == "[Deleted after approval]":
            return True

        # 1. Supabase Storage Deletion
        if settings.SUPABASE_URL and file_url.startswith(settings.SUPABASE_URL.rstrip('/')):
            try:
                bucket = settings.SUPABASE_BUCKET or "pso-evidence"
                # Public URL format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}
                marker = f"/storage/v1/object/public/{bucket}/"
                if marker in file_url:
                    object_path = file_url.split(marker, 1)[1]
                    delete_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{object_path}"
                    headers = {
                        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                        "apikey": settings.SUPABASE_KEY,
                    }
                    with httpx.Client(timeout=4.0) as client:
                        resp = client.delete(delete_url, headers=headers)
                        if resp.status_code in [200, 204]:
                            logger.info(f"Successfully deleted Supabase file: {object_path}")
                            return True
                        else:
                            logger.warning(f"Supabase delete returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Failed to delete file from Supabase storage ({file_url}): {e}")

        # 2. Local Storage Deletion
        try:
            filename = os.path.basename(file_url)
            local_path = os.path.join(settings.UPLOAD_DIR, filename)
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Successfully deleted local file: {local_path}")
                return True
        except Exception as e:
            logger.warning(f"Failed to delete local file ({file_url}): {e}")

        return False

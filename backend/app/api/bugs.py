from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_admin
from backend.app.models.models import (
    User, UserRole, BugReport, BugReportStatus, BugReportSeverity, BugReportCategory
)
from backend.app.services.storage_service import StorageService

router = APIRouter(prefix="", tags=["bugs"])


class BugReportCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field(default=BugReportCategory.OTHER)
    severity: str = Field(default=BugReportSeverity.MEDIUM)
    description: str = Field(..., min_length=5)
    steps_to_reproduce: Optional[str] = None
    device_info: Optional[str] = None
    screenshot_url: Optional[str] = None


class BugReportUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    severity: Optional[str] = None
    category: Optional[str] = None


class BugReportResponse(BaseModel):
    id: int
    reporter_id: int
    title: str
    category: str
    severity: str
    description: str
    steps_to_reproduce: Optional[str] = None
    device_info: Optional[str] = None
    screenshot_url: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Reporter info
    reporter_name: Optional[str] = None
    reporter_player_id: Optional[str] = None
    reporter_role: Optional[str] = None
    reporter_photo: Optional[str] = None
    resolver_name: Optional[str] = None

    class Config:
        from_attributes = True


def serialize_bug(bug: BugReport) -> dict:
    return {
        "id": bug.id,
        "reporter_id": bug.reporter_id,
        "title": bug.title,
        "category": bug.category,
        "severity": bug.severity,
        "description": bug.description,
        "steps_to_reproduce": bug.steps_to_reproduce,
        "device_info": bug.device_info,
        "screenshot_url": bug.screenshot_url,
        "status": bug.status,
        "admin_notes": bug.admin_notes,
        "resolved_by": bug.resolved_by,
        "resolved_at": bug.resolved_at,
        "created_at": bug.created_at,
        "updated_at": bug.updated_at,
        "reporter_name": bug.reporter.name if bug.reporter else "Unknown Player",
        "reporter_player_id": bug.reporter.player_id if bug.reporter else "PSO-0000",
        "reporter_role": bug.reporter.role if bug.reporter else "USER",
        "reporter_photo": bug.reporter.profile_photo if bug.reporter else None,
        "resolver_name": bug.resolver.name if bug.resolver else None
    }


@router.post("", response_model=BugReportResponse, status_code=status.HTTP_201_CREATED)
def create_bug_report(
    data: BugReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate severity
    valid_severities = [BugReportSeverity.LOW, BugReportSeverity.MEDIUM, BugReportSeverity.HIGH, BugReportSeverity.CRITICAL]
    severity = data.severity.upper() if data.severity else BugReportSeverity.MEDIUM
    if severity not in valid_severities:
        severity = BugReportSeverity.MEDIUM

    # Validate category
    valid_categories = [
        BugReportCategory.MATCHES, BugReportCategory.SUBMISSIONS, BugReportCategory.LEADERBOARD,
        BugReportCategory.PROFILE, BugReportCategory.TEAMS, BugReportCategory.UI_ALIGNMENT, BugReportCategory.OTHER
    ]
    category = data.category.upper() if data.category else BugReportCategory.OTHER
    if category not in valid_categories:
        category = BugReportCategory.OTHER

    bug = BugReport(
        reporter_id=current_user.id,
        title=data.title.strip(),
        category=category,
        severity=severity,
        description=data.description.strip(),
        steps_to_reproduce=data.steps_to_reproduce.strip() if data.steps_to_reproduce else None,
        device_info=data.device_info.strip() if data.device_info else None,
        screenshot_url=data.screenshot_url.strip() if data.screenshot_url else None,
        status=BugReportStatus.OPEN
    )

    db.add(bug)
    db.commit()
    db.refresh(bug)

    return serialize_bug(bug)


@router.get("/my", response_model=List[BugReportResponse])
def get_my_bug_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bugs = (
        db.query(BugReport)
        .filter(BugReport.reporter_id == current_user.id)
        .order_by(desc(BugReport.created_at))
        .all()
    )
    return [serialize_bug(b) for b in bugs]


@router.get("", response_model=List[BugReportResponse])
def get_all_bug_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(BugReport)

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(BugReport.status == status_filter.upper())

    if severity and severity.upper() != "ALL":
        query = query.filter(BugReport.severity == severity.upper())

    if category and category.upper() != "ALL":
        query = query.filter(BugReport.category == category.upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (BugReport.title.ilike(term)) |
            (BugReport.description.ilike(term)) |
            (BugReport.steps_to_reproduce.ilike(term))
        )

    bugs = query.order_by(desc(BugReport.created_at)).all()
    return [serialize_bug(b) for b in bugs]


@router.get("/{bug_id}", response_model=BugReportResponse)
def get_bug_report(
    bug_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bug = db.query(BugReport).filter(BugReport.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug report not found")

    # Regular users can only see their own bugs
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN] and bug.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return serialize_bug(bug)


@router.patch("/{bug_id}", response_model=BugReportResponse)
def update_bug_report(
    bug_id: int,
    data: BugReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    bug = db.query(BugReport).filter(BugReport.id == bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug report not found")

    if data.status is not None:
        new_status = data.status.upper()
        valid_statuses = [BugReportStatus.OPEN, BugReportStatus.IN_PROGRESS, BugReportStatus.RESOLVED, BugReportStatus.CLOSED]
        if new_status in valid_statuses:
            bug.status = new_status
            if new_status in [BugReportStatus.RESOLVED, BugReportStatus.CLOSED]:
                bug.resolved_by = current_user.id
                bug.resolved_at = datetime.utcnow()
            else:
                bug.resolved_by = None
                bug.resolved_at = None

    if data.admin_notes is not None:
        bug.admin_notes = data.admin_notes.strip()

    if data.severity is not None:
        new_sev = data.severity.upper()
        if new_sev in [BugReportSeverity.LOW, BugReportSeverity.MEDIUM, BugReportSeverity.HIGH, BugReportSeverity.CRITICAL]:
            bug.severity = new_sev

    if data.category is not None:
        new_cat = data.category.upper()
        if new_cat in [
            BugReportCategory.MATCHES, BugReportCategory.SUBMISSIONS, BugReportCategory.LEADERBOARD,
            BugReportCategory.PROFILE, BugReportCategory.TEAMS, BugReportCategory.UI_ALIGNMENT, BugReportCategory.OTHER
        ]:
            bug.category = new_cat

    bug.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bug)

    return serialize_bug(bug)


@router.post("/upload-screenshot")
def upload_bug_screenshot(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_url, storage_type = StorageService.save_screenshot(file, match_id=0, db=db)
    return {
        "file_url": file_url,
        "storage_type": storage_type,
        "file_type": file.content_type or "image/webp"
    }

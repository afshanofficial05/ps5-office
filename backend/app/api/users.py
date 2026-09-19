from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from backend.app.core.database import get_db
from backend.app.models.models import User, UserRole, PlayerRating, PlayerAchievement, Achievement, AdminPermission
from backend.app.schemas.schemas import UserResponse, UserProfileDetail, UserUpdate, PlayerAchievementResponse
from backend.app.api.deps import get_current_user
from backend.app.services.storage_service import StorageService
from backend.app.services.audit_service import AuditService


router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    elif current_user.role == UserRole.USER:
        # Regular players should only see fellow players, never admins
        query = query.filter(User.role == UserRole.USER)

    if search:
        query = query.filter(
            or_(
                User.name.ilike(f"%{search}%"),
                User.player_id.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    return query.all()

@router.get("/{user_id}", response_model=UserProfileDetail)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    r_1v1 = db.query(PlayerRating).filter(PlayerRating.player_id == user.id, PlayerRating.game_mode == "1V1").first()
    r_2v2 = db.query(PlayerRating).filter(PlayerRating.player_id == user.id, PlayerRating.game_mode == "2V2").first()

    # Calculate ranks
    rank_1v1 = None
    if r_1v1:
        rank_1v1 = db.query(PlayerRating).filter(
            PlayerRating.game_mode == "1V1",
            PlayerRating.rating > r_1v1.rating
        ).count() + 1

    rank_2v2 = None
    if r_2v2:
        rank_2v2 = db.query(PlayerRating).filter(
            PlayerRating.game_mode == "2V2",
            PlayerRating.rating > r_2v2.rating
        ).count() + 1

    total_matches = (r_1v1.matches_played if r_1v1 else 0) + (r_2v2.matches_played if r_2v2 else 0)
    total_wins = (r_1v1.wins if r_1v1 else 0) + (r_2v2.wins if r_2v2 else 0)
    total_losses = (r_1v1.losses if r_1v1 else 0) + (r_2v2.losses if r_2v2 else 0)
    total_draws = (r_1v1.draws if r_1v1 else 0) + (r_2v2.draws if r_2v2 else 0)

    # Achievements
    user_achievements = db.query(PlayerAchievement).filter(PlayerAchievement.player_id == user.id).all()

    return UserProfileDetail(
        id=user.id,
        player_id=user.player_id,
        name=user.name,
        email=user.email,
        profile_photo=user.profile_photo,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        ratings=user.ratings,
        rating_1v1=r_1v1,
        rating_2v2=r_2v2,
        rank_1v1=rank_1v1,
        rank_2v2=rank_2v2,
        total_matches=total_matches,
        total_wins=total_wins,
        total_losses=total_losses,
        total_draws=total_draws,
        achievements=[
            {
                "id": pa.id,
                "achievement": {
                    "id": pa.achievement.id,
                    "name": pa.achievement.name,
                    "description": pa.achievement.description,
                    "icon": pa.achievement.icon,
                    "requirement_type": pa.achievement.requirement_type,
                    "requirement_value": pa.achievement.requirement_value
                },
                "awarded_at": pa.awarded_at
            } for pa in user_achievements
        ]
    )

@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id:
        if current_user.role == UserRole.ADMIN:
            perm = db.query(AdminPermission).filter(
                AdminPermission.admin_id == current_user.id,
                AdminPermission.permission.in_(["EDIT_PLAYER", "PLAYER_MANAGEMENT"]),
                AdminPermission.enabled == True
            ).first()
            if not perm:
                raise HTTPException(status_code=403, detail="Admin does not possess required permission: EDIT_PLAYER")
        elif current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot edit another user's profile")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name:
        user.name = payload.name
    if payload.profile_photo is not None:
        user.profile_photo = payload.profile_photo if payload.profile_photo.strip() else None
    if payload.status and current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        user.status = payload.status

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.ADMIN:
        perm = db.query(AdminPermission).filter(
            AdminPermission.admin_id == current_user.id,
            AdminPermission.permission.in_(["DELETE_PLAYER", "PLAYER_MANAGEMENT"]),
            AdminPermission.enabled == True
        ).first()
        if not perm:
            raise HTTPException(status_code=403, detail="Admin does not possess required permission: DELETE_PLAYER")
    elif current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super Admin or Admin privileges required")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Cannot delete Super Admin account")

    name = target.name
    db.delete(target)

    AuditService.log(
        db=db,
        action="DELETE_USER",
        entity_type="USER",
        entity_id=str(user_id),
        actor_id=current_user.id,
        old_value=f"Deleted user {name}"
    )

    db.commit()
    return {"message": f"User {name} deleted successfully"}


@router.post("/{user_id}/photo", response_model=UserResponse)
def upload_user_photo(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Cannot upload photo for another user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    content_type = file.content_type or ""
    filename_lower = (file.filename or "").lower()
    valid_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
    if not (content_type.startswith("image/") or filename_lower.endswith(valid_extensions)):
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WEBP, GIF) are allowed")

    try:
        photo_url, _ = StorageService.save_file(file, prefix="avatar")
        user.profile_photo = photo_url
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


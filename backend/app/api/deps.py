from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import decode_token
from backend.app.models.models import User, UserRole, AdminPermission

security = HTTPBearer(auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided"
        )
    
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    return user

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required"
        )
    return current_user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

from typing import Generator, Optional, List, Union

def check_admin_permission(permission_input: Union[str, List[str]]):
    if isinstance(permission_input, str):
        target_perms = [permission_input]
    else:
        target_perms = list(permission_input)

    # Legacy mapping for backwards-compatibility
    legacy_map = {
        "VERIFY_RESULTS": ["RESULT_VERIFICATION"],
        "RESULT_VERIFICATION": ["VERIFY_RESULTS"],
        "MANUAL_MATCH_CREATE": ["MATCH_MANAGEMENT"],
        "MATCH_MANAGEMENT": ["MANUAL_MATCH_CREATE", "VIEW_MATCHES", "EDIT_MATCH", "DELETE_MATCH"],
        "VIEW_PLAYERS": ["PLAYER_MANAGEMENT"],
        "CREATE_PLAYER": ["PLAYER_MANAGEMENT"],
        "EDIT_PLAYER": ["PLAYER_MANAGEMENT"],
        "DELETE_PLAYER": ["PLAYER_MANAGEMENT"],
        "PLAYER_MANAGEMENT": ["VIEW_PLAYERS", "CREATE_PLAYER", "EDIT_PLAYER", "DELETE_PLAYER"],
        "VIEW_TEAMS": ["TEAM_MANAGEMENT"],
        "CREATE_TEAM": ["TEAM_MANAGEMENT"],
        "EDIT_TEAM": ["TEAM_MANAGEMENT"],
        "DELETE_TEAM": ["TEAM_MANAGEMENT"],
        "APPROVE_TEAM_REQUESTS": ["TEAM_MANAGEMENT"],
        "TEAM_MANAGEMENT": ["VIEW_TEAMS", "CREATE_TEAM", "EDIT_TEAM", "DELETE_TEAM", "APPROVE_TEAM_REQUESTS"],
        "VIEW_SEASON": ["SEASON_MANAGEMENT"],
        "CREATE_SEASON": ["SEASON_MANAGEMENT"],
        "EDIT_SEASON": ["SEASON_MANAGEMENT"],
        "DELETE_SEASON": ["SEASON_MANAGEMENT"],
        "UPDATE_SEASON_STATS": ["SEASON_MANAGEMENT"],
        "MANAGE_SEASON_RESULTS": ["SEASON_MANAGEMENT"],
        "VIEW_SEASON_LEADERBOARD": ["SEASON_MANAGEMENT"],
        "SEASON_MANAGEMENT": ["VIEW_SEASON", "CREATE_SEASON", "EDIT_SEASON", "DELETE_SEASON", "UPDATE_SEASON_STATS", "MANAGE_SEASON_RESULTS", "VIEW_SEASON_LEADERBOARD"],
        "VIEW_REPORTS": ["REPORT_MANAGEMENT"],
        "GENERATE_REPORTS": ["REPORT_MANAGEMENT"],
        "REPORT_MANAGEMENT": ["VIEW_REPORTS", "GENERATE_REPORTS"],
    }

    all_accepted = set(target_perms)
    for p in target_perms:
        if p in legacy_map:
            all_accepted.update(legacy_map[p])

    def permission_checker(
        db: Session = Depends(get_db),
        current_user: User = Depends(require_admin)
    ) -> User:
        if current_user.role == UserRole.SUPER_ADMIN:
            return current_user
        
        perm = db.query(AdminPermission).filter(
            AdminPermission.admin_id == current_user.id,
            AdminPermission.permission.in_(list(all_accepted)),
            AdminPermission.enabled == True
        ).first()

        if not perm:
            display_name = target_perms[0] if len(target_perms) == 1 else " / ".join(target_perms)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Admin does not possess required permission: {display_name}"
            )
        return current_user
    return permission_checker


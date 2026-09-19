import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.models.models import User, UserRole, PlayerRating
from backend.app.schemas.schemas import LoginRequest, RegisterRequest, Token, UserResponse, UserProfileDetail
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=Token)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Generate unique player ID e.g. PSO-1045
    while True:
        p_code = f"PSO-{random.randint(1000, 9999)}"
        if not db.query(User).filter(User.player_id == p_code).first():
            break

    new_user = User(
        player_id=p_code,
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        profile_photo=payload.profile_photo.strip() if payload.profile_photo and payload.profile_photo.strip() else None,
        role=UserRole.USER,
        status="ACTIVE",
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.flush()

    # Create default ratings (1500 for both 1V1 and 2V2)
    db.add(PlayerRating(player_id=new_user.id, game_mode="1V1", rating=1500.0))
    db.add(PlayerRating(player_id=new_user.id, game_mode="2V2", rating=1500.0))

    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}

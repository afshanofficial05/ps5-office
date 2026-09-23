from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.models import User, PushSubscription, InAppNotification
from backend.app.schemas.schemas import (
    PushSubscriptionCreate, PushSubscriptionUnsubscribe, DeviceSubscriptionResponse,
    NotificationPreferencesUpdate, InAppNotificationResponse, NotificationStatusResponse
)
from backend.app.api.deps import get_current_user
from backend.app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/vapid-public-key")
def get_vapid_public_key():
    """
    Returns the public VAPID key used by clients to subscribe to browser push notifications.
    """
    return {
        "public_key": settings.VAPID_PUBLIC_KEY,
        "subject": settings.VAPID_SUBJECT,
        "is_configured": bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)
    }

@router.get("/status", response_model=NotificationStatusResponse)
def get_notification_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns diagnostic and subscription status for the current user.
    """
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    
    # Check current preferences from latest subscription or default True
    notify_rooms = True
    notify_leaderboard = True
    if subs:
        notify_rooms = subs[0].notify_rooms
        notify_leaderboard = subs[0].notify_leaderboard

    return {
        "vapid_public_key": settings.VAPID_PUBLIC_KEY,
        "is_configured": bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY),
        "active_subscriptions": len(subs),
        "notify_rooms": notify_rooms,
        "notify_leaderboard": notify_leaderboard
    }

@router.get("/devices", response_model=List[DeviceSubscriptionResponse])
def get_user_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all registered devices for the current user.
    """
    devices = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id)
        .order_by(desc(PushSubscription.last_active_at))
        .all()
    )
    return devices

@router.delete("/devices/{device_id}")
def delete_user_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a registered device push subscription by its ID.
    """
    sub = db.query(PushSubscription).filter(
        PushSubscription.id == device_id,
        PushSubscription.user_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Device subscription not found")
    db.delete(sub)
    db.commit()
    return {"status": "deleted", "id": device_id}

@router.post("/subscribe")
def subscribe_push(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves or updates browser push notification subscription for the current user and device.
    """
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent or existing.user_agent
        if payload.device_name:
            existing.device_name = payload.device_name
        if payload.device_type:
            existing.device_type = payload.device_type
        existing.last_active_at = datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        db.commit()
        return {"status": "updated", "id": existing.id, "device_name": existing.device_name}

    new_sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
        device_name=payload.device_name or "Web Device",
        device_type=payload.device_type or "UNKNOWN",
        last_active_at=datetime.utcnow(),
        notify_rooms=True,
        notify_leaderboard=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return {"status": "subscribed", "id": new_sub.id, "device_name": new_sub.device_name}

@router.post("/unsubscribe")
def unsubscribe_push(
    payload: Optional[PushSubscriptionUnsubscribe] = None,
    endpoint: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Removes a push subscription by endpoint (supports JSON body or query param).
    """
    target_endpoint = payload.endpoint if (payload and payload.endpoint) else endpoint
    if not target_endpoint:
        raise HTTPException(status_code=400, detail="Endpoint is required to unsubscribe")

    sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == target_endpoint,
        PushSubscription.user_id == current_user.id
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"status": "unsubscribed"}

@router.post("/preferences")
def update_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates notification preference toggles for the user's subscriptions.
    """
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    for sub in subs:
        if payload.notify_rooms is not None:
            sub.notify_rooms = payload.notify_rooms
        if payload.notify_leaderboard is not None:
            sub.notify_leaderboard = payload.notify_leaderboard
    db.commit()
    return {"status": "preferences_saved", "updated_count": len(subs)}

@router.post("/test")
def trigger_diagnostic_test(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends an immediate diagnostic test push notification to all devices registered by current user.
    """
    result = NotificationService.send_diagnostic_test(db, current_user)
    return result

@router.get("", response_model=List[InAppNotificationResponse])
def get_in_app_notifications(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns recent in-app notifications for user's notification center drawer.
    """
    items = (
        db.query(InAppNotification)
        .filter(InAppNotification.user_id == current_user.id)
        .order_by(desc(InAppNotification.created_at))
        .limit(limit)
        .all()
    )
    return items

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.is_read = True
    db.commit()
    return {"status": "marked_read"}

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(InAppNotification).filter(
        InAppNotification.user_id == current_user.id,
        InAppNotification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "all_marked_read"}

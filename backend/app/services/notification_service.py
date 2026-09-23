import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from backend.app.core.config import settings
from backend.app.models.models import (
    PushSubscription, InAppNotification, User, Match, MatchPlayer
)

logger = logging.getLogger("notifications")

class PushResult:
    def __init__(self, success: bool, is_expired: bool = False, error: Optional[str] = None):
        self.success = success
        self.is_expired = is_expired
        self.error = error

    def __bool__(self):
        return self.success


class NotificationService:
    @staticmethod
    def get_vapid_claims() -> Dict[str, str]:
        subject = settings.VAPID_SUBJECT.strip()
        if not subject.startswith("mailto:") and "@" in subject:
            subject = f"mailto:{subject}"
        return {"sub": subject}

    @staticmethod
    def send_push_payload(
        endpoint: str,
        p256dh: str,
        auth: str,
        payload: Dict[str, Any]
    ) -> PushResult:
        """
        Sends an encrypted Web Push notification to a specific browser endpoint.
        Returns a PushResult. is_expired is True ONLY when HTTP 404 or 410 is returned.
        """
        if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
            logger.warning("[PUSH] VAPID keys not configured. Skipping push delivery.")
            return PushResult(False, False, "VAPID keys not configured")

        subscription_info = {
            "endpoint": endpoint,
            "keys": {
                "p256dh": p256dh,
                "auth": auth
            }
        }

        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=NotificationService.get_vapid_claims(),
                ttl=3600
            )
            return PushResult(True, False)
        except WebPushException as ex:
            status_code = getattr(ex.response, "status_code", None) if hasattr(ex, "response") and ex.response else None
            is_expired = status_code in [404, 410]
            logger.warning(f"[PUSH ERROR] Failed to send push (status={status_code}, expired={is_expired}): {ex}")
            return PushResult(False, is_expired, str(ex))
        except Exception as e:
            logger.error(f"[PUSH ERROR] Unexpected error sending push: {e}")
            return PushResult(False, False, str(e))

    @staticmethod
    def create_in_app_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        type: str = "SYSTEM",
        data_url: Optional[str] = None
    ) -> InAppNotification:
        notification = InAppNotification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            data_url=data_url,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        return notification

    @staticmethod
    def notify_room_created(db: Session, match: Match, creator: User):
        """
        Broadcasts notification to all active players who have notify_rooms enabled.
        Delivers to all registered devices for each eligible user.
        """
        title = f"⚽ New {match.game_mode} Match Room!"
        body = f"{creator.name} opened room {match.match_code}. Tap to challenge or join!"
        url = "/matches/join"

        payload = {
            "title": title,
            "body": body,
            "icon": "/gamepad_banner.jpg",
            "badge": "/gamepad_banner.jpg",
            "tag": f"room-{match.match_code}",
            "data": {
                "url": url,
                "type": "ROOM_CREATED",
                "match_code": match.match_code
            }
        }

        # Find eligible subscriptions across all devices
        subscriptions = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.notify_rooms == True,
                PushSubscription.user_id != creator.id
            )
            .all()
        )

        expired_ids = []
        user_ids_notified = set()

        for sub in subscriptions:
            res = NotificationService.send_push_payload(
                sub.endpoint, sub.p256dh, sub.auth, payload
            )
            if res.success:
                user_ids_notified.add(sub.user_id)
                sub.last_active_at = datetime.utcnow()
            elif res.is_expired:
                expired_ids.append(sub.id)

        # Clean up ONLY truly expired subscriptions (HTTP 404 or 410)
        if expired_ids:
            try:
                db.query(PushSubscription).filter(PushSubscription.id.in_(expired_ids)).delete(synchronize_session=False)
            except Exception:
                pass

        # Create in-app notifications for all active users except creator
        active_users = db.query(User).filter(User.status == "ACTIVE", User.id != creator.id).all()
        for u in active_users:
            NotificationService.create_in_app_notification(
                db, u.id, title, body, type="ROOM_CREATED", data_url=url
            )
        db.commit()

    @staticmethod
    def notify_match_approved(db: Session, match: Match):
        """
        Sends notifications to participating players across all their devices when match results are approved.
        """
        if not match.players:
            return

        for p in match.players:
            if not p.player_id:
                continue

            change = p.rating_change or 0
            after = p.player_rating_after or p.player_rating_before or 1200
            sign = "+" if change >= 0 else ""

            title = f"🏆 Match Result Verified! ({match.game_mode})"
            body = f"Rating change: {sign}{change} Elo | New rating: {after:.0f}. Leaderboard updated!"
            url = "/leaderboards"

            payload = {
                "title": title,
                "body": body,
                "icon": "/gamepad_banner.jpg",
                "badge": "/gamepad_banner.jpg",
                "tag": f"match-{match.id}",
                "data": {
                    "url": url,
                    "type": "LEADERBOARD_UPDATE",
                    "match_id": match.id
                }
            }

            # In-app notification
            NotificationService.create_in_app_notification(
                db, p.player_id, title, body, type="LEADERBOARD_UPDATE", data_url=url
            )

            # Push notifications to all player's devices
            subs = (
                db.query(PushSubscription)
                .filter(
                    PushSubscription.user_id == p.player_id,
                    PushSubscription.notify_leaderboard == True
                )
                .all()
            )

            expired_ids = []
            for sub in subs:
                res = NotificationService.send_push_payload(
                    sub.endpoint, sub.p256dh, sub.auth, payload
                )
                if res.success:
                    sub.last_active_at = datetime.utcnow()
                elif res.is_expired:
                    expired_ids.append(sub.id)

            if expired_ids:
                try:
                    db.query(PushSubscription).filter(PushSubscription.id.in_(expired_ids)).delete(synchronize_session=False)
                except Exception:
                    pass

        db.commit()

    @staticmethod
    def send_diagnostic_test(db: Session, user: User) -> Dict[str, Any]:
        """
        Sends an immediate diagnostic test notification to verify delivery across all current user's devices.
        """
        title = "🎮 PSO Gaming Arena: Diagnostics Test"
        body = f"Push notifications are working perfectly for {user.name}! (VAPID verified)"
        url = "/settings/notifications"

        payload = {
            "title": title,
            "body": body,
            "icon": "/gamepad_banner.jpg",
            "badge": "/gamepad_banner.jpg",
            "tag": "diagnostic-test",
            "data": {
                "url": url,
                "type": "TEST",
                "timestamp": datetime.utcnow().isoformat()
            }
        }

        # Create in-app notification
        NotificationService.create_in_app_notification(
            db, user.id, title, body, type="TEST", data_url=url
        )

        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
        sent_count = 0
        failed_count = 0
        expired_ids = []

        for sub in subs:
            res = NotificationService.send_push_payload(
                sub.endpoint, sub.p256dh, sub.auth, payload
            )
            if res.success:
                sent_count += 1
                sub.last_active_at = datetime.utcnow()
            else:
                failed_count += 1
                if res.is_expired:
                    expired_ids.append(sub.id)

        if expired_ids:
            try:
                db.query(PushSubscription).filter(PushSubscription.id.in_(expired_ids)).delete(synchronize_session=False)
            except Exception:
                pass

        db.commit()

        return {
            "status": "success" if (subs and sent_count > 0) or not subs else "delivered_to_available",
            "devices_registered": len(subs),
            "devices_delivered": sent_count,
            "devices_failed": failed_count,
            "vapid_public_key_configured": bool(settings.VAPID_PUBLIC_KEY),
            "subject": settings.VAPID_SUBJECT,
            "timestamp": datetime.utcnow().isoformat()
        }

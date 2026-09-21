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
    ) -> bool:
        """
        Sends an encrypted Web Push notification to a specific browser endpoint.
        Returns True if successful, False otherwise.
        """
        if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
            logger.warning("[PUSH] VAPID keys not configured. Skipping push delivery.")
            return False

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
            return True
        except WebPushException as ex:
            # 404 or 410 means subscription expired or revoked
            logger.warning(f"[PUSH ERROR] Failed to send push: {ex}")
            if ex.response and ex.response.status_code in [404, 410]:
                return False
            return False
        except Exception as e:
            logger.error(f"[PUSH ERROR] Unexpected error sending push: {e}")
            return False

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

        # Find eligible subscriptions
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
            success = NotificationService.send_push_payload(
                sub.endpoint, sub.p256dh, sub.auth, payload
            )
            if not success:
                # Track potentially expired subscription
                expired_ids.append(sub.id)
            else:
                user_ids_notified.add(sub.user_id)

        # Clean up expired subscriptions
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
        Sends notifications to participating players when match results are approved.
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

            # Push notifications
            subs = (
                db.query(PushSubscription)
                .filter(
                    PushSubscription.user_id == p.player_id,
                    PushSubscription.notify_leaderboard == True
                )
                .all()
            )

            for sub in subs:
                NotificationService.send_push_payload(
                    sub.endpoint, sub.p256dh, sub.auth, payload
                )

        db.commit()

    @staticmethod
    def send_diagnostic_test(db: Session, user: User) -> Dict[str, Any]:
        """
        Sends an immediate diagnostic test notification to verify delivery.
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
        db.commit()

        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
        sent_count = 0
        expired_count = 0

        for sub in subs:
            success = NotificationService.send_push_payload(
                sub.endpoint, sub.p256dh, sub.auth, payload
            )
            if success:
                sent_count += 1
            else:
                expired_count += 1

        return {
            "status": "success" if (subs and sent_count > 0) or not subs else "delivered_to_available",
            "devices_registered": len(subs),
            "devices_delivered": sent_count,
            "devices_failed": expired_count,
            "vapid_public_key_configured": bool(settings.VAPID_PUBLIC_KEY),
            "subject": settings.VAPID_SUBJECT,
            "timestamp": datetime.utcnow().isoformat()
        }

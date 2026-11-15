import json
import logging
import os
import threading
from urllib.parse import urlparse

from django.db import IntegrityError, close_old_connections
from django.db.models import Q
from pywebpush import WebPushException, webpush

from api.models.notifications import (
    NotificationDelivery,
    NotificationSettings,
    PushSubscription,
)
from api.utils.consts import TICKET_LIMIT

logger = logging.getLogger("api.notifications")

PUSH_TIMEOUT_SECONDS = 10

# Subscription endpoints are supplied by the client and the server later POSTs
# to them, so only accept the browsers' real push services.
ALLOWED_PUSH_HOST_SUFFIXES = (
    "fcm.googleapis.com",
    "android.googleapis.com",
    "push.services.mozilla.com",
    "notify.windows.com",
    "push.apple.com",
)


def web_push_configured():
    return bool(
        os.environ.get("WEB_PUSH_VAPID_PUBLIC_KEY")
        and os.environ.get("WEB_PUSH_VAPID_PRIVATE_KEY")
        and os.environ.get("WEB_PUSH_VAPID_SUBJECT")
    )


def is_allowed_push_endpoint(endpoint):
    try:
        parsed = urlparse(str(endpoint or ""))
    except ValueError:
        return False
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    return any(
        host == suffix or host.endswith("." + suffix)
        for suffix in ALLOWED_PUSH_HOST_SUFFIXES
    )


def _status_code(exc):
    # WebPushException carries the HTTP response, not a status_code attribute.
    response = getattr(exc, "response", None)
    return getattr(response, "status_code", None)


def send_push_to_user(user, payload):
    """Send a payload to every active device of a user. True if any succeeded."""
    if not web_push_configured() or not user:
        return False

    sent = False
    for subscription in PushSubscription.objects.filter(user=user, active=True):
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=json.dumps(payload),
                vapid_private_key=os.environ["WEB_PUSH_VAPID_PRIVATE_KEY"],
                vapid_claims={"sub": os.environ["WEB_PUSH_VAPID_SUBJECT"]},
                ttl=600,
                timeout=PUSH_TIMEOUT_SECONDS,
            )
            sent = True
        except WebPushException as exc:
            if _status_code(exc) in (404, 410):
                # Subscription expired or the user revoked permission.
                subscription.delete()
            else:
                logger.warning(
                    "Web Push failed for subscription %s: %s", subscription.id, exc
                )
        except Exception:
            logger.exception(
                "Unexpected Web Push failure for subscription %s", subscription.id
            )

    return sent


def run_in_background(fn, *args, **kwargs):
    """Run fn in a daemon thread so a slow push service never delays a request."""

    def runner():
        try:
            fn(*args, **kwargs)
        except Exception:
            logger.exception("Background push task failed")
        finally:
            close_old_connections()

    threading.Thread(target=runner, daemon=True).start()


def deliver_push(user, notification_type, key, payload, pref_field=None):
    """
    Send one notification at most once per (user, type, key). The delivery row
    is claimed *before* sending so overlapping runs can't double-send, and is
    released if nothing could be delivered (so a retry is possible).
    """
    if pref_field and NotificationSettings.objects.filter(
        user=user, **{pref_field: False}
    ).exists():
        return False

    try:
        NotificationDelivery.objects.create(
            user=user, notification_type=notification_type, reference_key=key
        )
    except IntegrityError:
        return False

    if send_push_to_user(user, payload):
        return True

    NotificationDelivery.objects.filter(
        user=user, notification_type=notification_type, reference_key=key
    ).delete()
    return False


def push_recipients(*, pref_field=None, captains_only=False, tickets_left=False):
    """
    Active, non-cut ballcrew with a login and at least one active device,
    skipping anyone who turned `pref_field` off.
    """
    from api.models.ballkid import Ballkid

    qs = Ballkid.objects.filter(
        is_active=True,
        is_cut=False,
        user__isnull=False,
        user__push_subscriptions__active=True,
    )
    if pref_field:
        qs = qs.exclude(**{f"user__notification_settings__{pref_field}": False})
    if captains_only:
        qs = qs.filter(Q(is_captain=True) | Q(is_chairperson=True))
    if tickets_left:
        qs = qs.filter(Q(num_tickets__lt=TICKET_LIMIT) | Q(num_tickets__isnull=True))
    return list(qs.select_related("user").distinct())
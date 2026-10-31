import json
import logging
import os
from urllib.parse import urlparse

from pywebpush import WebPushException, webpush

from api.models.notifications import PushSubscription

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
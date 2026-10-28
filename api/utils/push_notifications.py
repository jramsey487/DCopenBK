import json
import logging
import os

from pywebpush import WebPushException, webpush

from api.models.notifications import PushSubscription

logger = logging.getLogger("api.notifications")


def web_push_configured():
    return bool(
        os.environ.get("WEB_PUSH_VAPID_PUBLIC_KEY")
        and os.environ.get("WEB_PUSH_VAPID_PRIVATE_KEY")
        and os.environ.get("WEB_PUSH_VAPID_SUBJECT")
    )


def send_push_to_user(user, payload):
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
            )
            sent = True
        except WebPushException as exc:
            if getattr(exc, "status_code", None) in (404, 410):
                subscription.delete()
            else:
                logger.warning("Web Push failed for subscription %s: %s", subscription.id, exc)
        except Exception:
            logger.exception("Unexpected Web Push failure for subscription %s", subscription.id)

    return sent

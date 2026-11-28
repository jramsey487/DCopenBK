"""Email operational alerts for durable notification delivery health."""

import logging

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from api.utils.contact_email import get_contact_tournament, get_tournament_contact_email

logger = logging.getLogger("api.notifications")

ALERT_COOLDOWN_SECONDS = 6 * 60 * 60
ALERT_CACHE_KEY = "dcopenbk:operational-alert:delivery-outbox"


def alert_delivery_outbox_health(
    *,
    push_failed,
    push_stale,
    ticket_email_failed,
    ticket_email_stale,
):
    """Email the configured operational recipient for stale or failed delivery work.

    An alert-specific recipient wins; otherwise use the tournament public
    contact email, which itself falls back to the configured support mailbox.
    """
    metrics = {
        "Failed push notifications": push_failed,
        "Stale push notification leases": push_stale,
        "Failed ticket emails": ticket_email_failed,
        "Stale ticket-email leases": ticket_email_stale,
    }
    problems = [(label, count) for label, count in metrics.items() if count]
    if not problems:
        cache.delete(ALERT_CACHE_KEY)
        return False

    tournament = get_contact_tournament()
    recipient = (
        (getattr(tournament, "operational_alert_email", "") or "").strip()
        if tournament is not None
        else ""
    ) or get_tournament_contact_email()
    if not recipient:
        logger.error("Cannot send delivery health alert: no tournament recipient or SMTP mailbox configured")
        return False

    # One alert per incident window; a persistent issue is re-reported every
    # six hours rather than flooding the shared volunteer inbox.
    if not cache.add(ALERT_CACHE_KEY, True, timeout=ALERT_COOLDOWN_SECONDS):
        return False

    lines = [
        "DCopenBK detected notification or ticket-email delivery work that needs attention.",
        "",
        *[f"{label}: {count}" for label, count in problems],
        "",
        f"Review the delivery queues in Django admin: {settings.SITE_BASE_URL.rstrip('/')}/admin/",
        "",
        "This alert is automatically deduplicated and may be repeated after six hours while the issue persists.",
    ]
    try:
        sent = send_mail(
            subject="[DCopenBK] Background delivery needs attention",
            message="\n".join(lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        if sent != 1:
            raise RuntimeError("Django email backend did not report the alert as sent")
    except Exception:
        cache.delete(ALERT_CACHE_KEY)
        logger.exception("Failed to send delivery health alert to the shared SMTP mailbox")
        return False

    logger.warning(
        "Sent delivery health alert to configured recipient; "
        "push_failed=%s push_stale=%s ticket_email_failed=%s ticket_email_stale=%s",
        push_failed,
        push_stale,
        ticket_email_failed,
        ticket_email_stale,
    )
    return True

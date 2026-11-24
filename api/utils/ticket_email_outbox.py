"""Durable ticket-email outbox processed by the existing scheduler."""

import hashlib
import json
import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from api.models.notifications import TicketEmailDelivery

logger = logging.getLogger("api.ticket_emails")

MAX_ATTEMPTS = 10
LEASE_SECONDS = 300
BASE_RETRY_SECONDS = 30
MAX_RETRY_SECONDS = 3600


def enqueue_ticket_email(ballkid, subject, template_name, context):
    """Persist an email before returning; identical event payloads enqueue once."""
    if not ballkid or not ballkid.user_id:
        return False
    recipient = (ballkid.user.email or "").strip()
    if not recipient:
        return False

    payload = {
        "recipient": recipient,
        "subject": str(subject)[:255],
        "template_name": str(template_name),
        "context": context,
    }
    fingerprint = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    key = hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()
    _, created = TicketEmailDelivery.objects.get_or_create(
        idempotency_key=key,
        defaults=payload,
    )
    return created


def _claim_next_email():
    now = timezone.now()
    due = (
        Q(status=TicketEmailDelivery.STATUS_PENDING, available_at__lte=now)
        | Q(status=TicketEmailDelivery.STATUS_PROCESSING, locked_until__lte=now)
        | Q(status=TicketEmailDelivery.STATUS_PROCESSING, locked_until__isnull=True)
    )
    with transaction.atomic():
        item = (
            TicketEmailDelivery.objects.select_for_update(skip_locked=True)
            .filter(due)
            .order_by("available_at", "pk")
            .first()
        )
        if item is None:
            return None
        item.status = TicketEmailDelivery.STATUS_PROCESSING
        item.locked_until = now + timedelta(seconds=LEASE_SECONDS)
        item.attempts += 1
        item.save(update_fields=["status", "locked_until", "attempts"])
        return item.pk, item.locked_until


def _send(item):
    from django.utils.html import strip_tags
    from api.utils.ticket_emails import (
        _deliver_html_email,
        render_ticket_email,
        ticket_logo_url_for_send,
    )

    context = dict(item.context or {})
    context.setdefault("email_title", item.subject)
    context["logo_url"] = ticket_logo_url_for_send()
    html = render_ticket_email(item.template_name, context)
    _deliver_html_email(item.recipient, item.subject, html, strip_tags(html))


def _finish_sent(item_id, lease_until):
    return TicketEmailDelivery.objects.filter(
        pk=item_id,
        status=TicketEmailDelivery.STATUS_PROCESSING,
        locked_until=lease_until,
    ).update(
        status=TicketEmailDelivery.STATUS_SENT,
        sent_at=timezone.now(),
        locked_until=None,
        last_error="",
    )


def _finish_failure(item_id, lease_until, error):
    item = TicketEmailDelivery.objects.filter(
        pk=item_id,
        status=TicketEmailDelivery.STATUS_PROCESSING,
        locked_until=lease_until,
    ).first()
    if item is None:
        return
    now = timezone.now()
    if item.attempts >= MAX_ATTEMPTS:
        new_status = TicketEmailDelivery.STATUS_FAILED
        available_at = item.available_at
    else:
        new_status = TicketEmailDelivery.STATUS_PENDING
        delay = min(MAX_RETRY_SECONDS, BASE_RETRY_SECONDS * (2 ** (item.attempts - 1)))
        available_at = now + timedelta(seconds=delay)
    TicketEmailDelivery.objects.filter(
        pk=item_id,
        status=TicketEmailDelivery.STATUS_PROCESSING,
        locked_until=lease_until,
    ).update(
        status=new_status,
        available_at=available_at,
        locked_until=None,
        last_error=str(error)[:2000],
    )


def process_ticket_email_outbox(limit=100):
    """Send due ticket emails outside DB transactions; retry transient failures."""
    sent = 0
    for _ in range(max(0, limit)):
        claim = _claim_next_email()
        if claim is None:
            break
        item_id, lease_until = claim
        item = TicketEmailDelivery.objects.filter(pk=item_id).first()
        if item is None:
            continue
        try:
            _send(item)
            if _finish_sent(item_id, lease_until):
                sent += 1
        except Exception as exc:
            logger.exception("Ticket email delivery failed for outbox row %s", item_id)
            _finish_failure(item_id, lease_until, exc)
    return sent

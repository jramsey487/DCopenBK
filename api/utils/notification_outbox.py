"""Durable, retryable delivery for browser push notifications.

Rows are inserted in the same database transaction as the event that caused
them. The scheduler claims rows with a short lease, sends outside the database
transaction, then records success or schedules a retry. This is at-least-once
delivery: a process can die after the push provider accepts a message but
before success is recorded, so a retry may occasionally produce a duplicate.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from api.models.notifications import NotificationDelivery, NotificationSettings
from api.utils.push_notifications import send_push_to_user, web_push_configured

logger = logging.getLogger("api.notifications")

MAX_ATTEMPTS = 10
LEASE_SECONDS = 300
BASE_RETRY_SECONDS = 30
MAX_RETRY_SECONDS = 3600


def enqueue_push(user, notification_type, key, payload, pref_field=None):
    """Persist one notification for a user; the unique key makes enqueue idempotent."""
    if not user or not web_push_configured():
        return False

    if pref_field and NotificationSettings.objects.filter(
        user=user, **{pref_field: False}
    ).exists():
        return False

    delivery, created = NotificationDelivery.objects.get_or_create(
        user=user,
        notification_type=notification_type,
        reference_key=str(key),
        defaults={
            "payload": payload,
            "status": NotificationDelivery.STATUS_PENDING,
            "available_at": timezone.now(),
        },
    )
    if not created and delivery.status == NotificationDelivery.STATUS_FAILED:
        # A deliberate repeat of the same event should not silently revive a
        # permanently failed item; operational retry is an explicit action.
        return False
    return created


def _claim_next_delivery():
    """Claim one due row; the lease lets another worker recover after a crash."""
    now = timezone.now()
    retryable = (
        Q(status=NotificationDelivery.STATUS_PENDING, available_at__lte=now)
        | Q(
            status=NotificationDelivery.STATUS_PROCESSING,
            locked_until__lte=now,
        )
        | Q(
            status=NotificationDelivery.STATUS_PROCESSING,
            locked_until__isnull=True,
        )
    )

    with transaction.atomic():
        delivery = (
            NotificationDelivery.objects.select_for_update(skip_locked=True)
            .filter(retryable)
            .order_by("available_at", "pk")
            .first()
        )
        if delivery is None:
            return None

        delivery.status = NotificationDelivery.STATUS_PROCESSING
        delivery.locked_until = now + timedelta(seconds=LEASE_SECONDS)
        delivery.attempts += 1
        delivery.save(update_fields=["status", "locked_until", "attempts"])
        return delivery.pk, delivery.locked_until


def _mark_sent(delivery_id, lease_until):
    NotificationDelivery.objects.filter(
        pk=delivery_id,
        status=NotificationDelivery.STATUS_PROCESSING,
        locked_until=lease_until,
    ).update(
        status=NotificationDelivery.STATUS_SENT,
        sent_at=timezone.now(),
        locked_until=None,
        last_error="",
    )


def _mark_failed(delivery_id, lease_until, error):
    delivery = NotificationDelivery.objects.filter(
        pk=delivery_id,
        status=NotificationDelivery.STATUS_PROCESSING,
        locked_until=lease_until,
    ).first()
    if delivery is None:
        return

    now = timezone.now()
    if delivery.attempts >= MAX_ATTEMPTS:
        status = NotificationDelivery.STATUS_FAILED
        available_at = delivery.available_at
    else:
        status = NotificationDelivery.STATUS_PENDING
        delay = min(
            MAX_RETRY_SECONDS,
            BASE_RETRY_SECONDS * (2 ** max(0, delivery.attempts - 1)),
        )
        available_at = now + timedelta(seconds=delay)

    NotificationDelivery.objects.filter(
        pk=delivery_id,
        status=NotificationDelivery.STATUS_PROCESSING,
        locked_until=lease_until,
    ).update(
        status=status,
        available_at=available_at,
        locked_until=None,
        last_error=str(error)[:2000],
    )


def process_notification_outbox(limit=100):
    """Deliver up to limit due notifications and return the success count."""
    if not web_push_configured():
        return 0

    sent = 0
    for _ in range(max(0, limit)):
        claim = _claim_next_delivery()
        if claim is None:
            break
        delivery_id, lease_until = claim

        delivery = NotificationDelivery.objects.select_related("user").filter(
            pk=delivery_id
        ).first()
        if delivery is None:
            continue

        try:
            if send_push_to_user(delivery.user, delivery.payload):
                _mark_sent(delivery_id, lease_until)
                sent += 1
            else:
                _mark_failed(
                    delivery_id,
                    lease_until,
                    "Push delivery did not succeed on any active device.",
                )
        except Exception as exc:
            logger.exception("Unexpected outbox delivery failure for row %s", delivery_id)
            _mark_failed(delivery_id, lease_until, exc)

    return sent

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    user_agent = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class NotificationSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="notification_settings")
    shift_reminders_enabled = models.BooleanField(default=True)
    team_changes_enabled = models.BooleanField(default=True)
    ticket_updates_enabled = models.BooleanField(default=True)
    announcements_enabled = models.BooleanField(default=True)


class NotificationDelivery(models.Model):
    """Durable, per-user Web Push outbox entry and delivery history."""

    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    )

    NOTIFICATION_TYPES = (
        ("shift_reminder", "Shift reminder"),
        ("team_change", "Team change"),
        ("ticket_round", "Ticket round live"),
        ("ticket_results", "Ticket results"),
        ("waitlist_spot", "Waitlist spot opened"),
        ("announcement", "Announcement"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=40, choices=NOTIFICATION_TYPES)
    reference_key = models.CharField(max_length=120)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    available_at = models.DateTimeField(default=timezone.now, db_index=True)
    locked_until = models.DateTimeField(null=True, blank=True, db_index=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "notification_type", "reference_key"],
                name="unique_notification_delivery",
            )
        ]
        indexes = [
            models.Index(fields=["status", "available_at"], name="notif_outbox_due_idx"),
            models.Index(fields=["status", "locked_until"], name="notif_outbox_lock_idx"),
        ]

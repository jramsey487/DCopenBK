from django.contrib.auth.models import User
from django.db import models


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


class NotificationDelivery(models.Model):
    NOTIFICATION_TYPES = (
        ("shift_reminder", "Shift reminder"),
        ("team_change", "Team change"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=40, choices=NOTIFICATION_TYPES)
    reference_key = models.CharField(max_length=120)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "notification_type", "reference_key"],
                name="unique_notification_delivery",
            )
        ]

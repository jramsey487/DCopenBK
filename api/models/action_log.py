"""
ActionLog: an append-only record of who did what in the app.

One row per action. When a single request affects many people (Check out all,
Cut all, Archive all), the people are folded into one row: `count` is how many
and `items` lists them ({id, name, detail}).

Rows are written by api/utils/audit.py. Reset Data and Archive All never touch
this table, so the log survives a season rollover.
"""

from django.conf import settings
from django.db import models


class ActionLog(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    # Kept even if the account is later deleted; actor_name is the fallback.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    actor_name = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=60, db_index=True)
    category = models.CharField(max_length=30, db_index=True)
    target_name = models.CharField(max_length=200, blank=True)
    target_id = models.IntegerField(null=True, blank=True)
    detail = models.CharField(max_length=300, blank=True)
    count = models.PositiveIntegerField(default=1)
    items = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        who = self.actor_name or "system"
        return f"{self.created_at:%Y-%m-%d %H:%M} {who}: {self.action} {self.target_name}"

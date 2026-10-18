"""
Place at: api/models/captain_rating.py
Then add to wherever your models are collected, e.g.:
    from api.models.captain_rating import *
Separate from api.models.rating.Rating on purpose: Rating feeds the rcal
calibration, leaderboards and CalibrationParams, and crew->captain feedback
must not leak into any of that.
"""
from django.db import models

from api.models.ballkid import Ballkid


class CaptainRating(models.Model):
    class Context(models.TextChoices):
        WORKED_SHIFT = "shift", "Worked a shift with them"
        OFF_SHIFT = "off_shift", "Saw something off-shift"
        OTHER = "other", "Other"

    # Tournament year (set in the view with get_current_year()).
    year = models.IntegerField(db_index=True)
    # Stored for dedupe/moderation. Never exposed to chairs unless share_name.
    rater = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="captain_ratings_given"
    )
    captain = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="captain_ratings_received"
    )
    # Optional: a ballkid may submit written feedback without giving a star rating.
    rating = models.FloatField(null=True, blank=True)
    # Written feedback is required by the API; keep the database field flexible
    # so existing rows and direct database operations remain compatible.
    comments = models.TextField(default="", blank=True)
    context = models.CharField(
        max_length=20, choices=Context.choices, blank=True, default=""
    )
    share_name = models.BooleanField(default=False)  # per-rating opt-in
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["year", "rater", "captain"],
                name="one_captain_rating_per_rater_per_year",
            )
        ]
        # For one rating per day instead, add a `date` DateField and include
        # it in the constraint above.

    def __str__(self):
        return f"{self.year}: {self.rater.get_name()} rated captain {self.captain.get_name()} {self.rating}"

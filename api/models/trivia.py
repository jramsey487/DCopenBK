"""
Trivia models.

TriviaUse: records that a ballcrew member's application fun fact has been
announced at a morning meeting, so it never gets served up again that season.
Scoped by year via used_on (a new season's applications are new facts, so
last year's "used" marks simply stop matching -- no cleanup needed).
`fun_fact` is a snapshot of the text that was announced, so the "used" list
stays accurate even if the application is later edited or deleted.

TriviaScore: the LLM's verdict on one application's fun fact -- how
interesting it is (1-10) and whether it's safe to read aloud. `scored_text`
is the exact text that was scored, so an edited fact is detected as stale and
re-scored.
"""

from datetime import date

from django.conf import settings
from django.db import models

from api.models.application import BallcrewApplication
from api.models.ballkid import Ballkid


class TriviaUse(models.Model):
    ballkid = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="trivia_uses"
    )
    fun_fact = models.TextField(blank=True)
    used_on = models.DateField(default=date.today)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ballkid} trivia used on {self.used_on}"


class TriviaScore(models.Model):
    application = models.OneToOneField(
        BallcrewApplication,
        on_delete=models.CASCADE,
        related_name="trivia_score",
    )
    scored_text = models.TextField()
    interest_score = models.PositiveSmallIntegerField()
    is_safe = models.BooleanField(default=True)
    reason = models.CharField(max_length=200, blank=True)
    model_name = models.CharField(max_length=60, blank=True)
    scored_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"Application {self.application_id}: interest {self.interest_score}, "
            f"safe {self.is_safe}"
        )

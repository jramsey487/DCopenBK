"""
ApplicationEmailLog: one row per (application, kind) once that email has
been sent. The row is created *before* sending and removed again if the send
fails, so an applicant is never emailed the same message twice, even if a
chairperson clicks twice or two requests overlap.

kinds: accepted, waitlisted, rejected, waitlist_promoted, tryout_reminder

Delete a row (Django admin or shell) to allow that email to go out again.
"""

from django.db import models

from api.models.application import BallcrewApplication


class ApplicationEmailLog(models.Model):
    application = models.ForeignKey(
        BallcrewApplication, on_delete=models.CASCADE, related_name="email_logs"
    )
    kind = models.CharField(max_length=30)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sent_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["application", "kind"],
                name="one_application_email_per_kind",
            )
        ]

    def __str__(self):
        return f"{self.application_id}: {self.kind} at {self.sent_at}"

"""
ShiftGroup: a named set of ballkids that TeamsGenerator.create_teams() places
together on the same team, so they end up sharing the same working shift
(since a team's Schedule rows -- court + hour -- apply to everyone on that
team, regardless of which team number it ends up being).

Typical source: an applicant answering "Are you traveling with any potential
ballcrew? List their name below" on the application form. A chairperson
reviews that free-text answer and, if it checks out, creates a ShiftGroup
here linking the relevant Ballkid records once they're on the roster --
this is a manual, deliberate step, not an automatic parse of that text
field (name-matching free text to roster records reliably isn't something
to trust unsupervised).
"""

from django.db import models

from api.models.ballkid import Ballkid


class ShiftGroup(models.Model):
    name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional label, e.g. a family or friend-group name.",
    )
    ballkids = models.ManyToManyField(Ballkid, related_name="shift_groups")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.name:
            return self.name
        members = ", ".join(
            f"{b.first_name} {b.last_name}" for b in self.ballkids.all()
        )
        return members or f"Shift group #{self.pk}"

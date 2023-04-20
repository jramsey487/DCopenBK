from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from datetime import datetime
from api.models.ballkid import Ballkid


class Rating(models.Model):
    ratee = models.ForeignKey(Ballkid, on_delete=models.CASCADE, related_name="ratee")
    rater = models.ForeignKey(Ballkid, on_delete=models.CASCADE, related_name="rater")
    date = models.DateField(default=datetime.today)
    rating = models.FloatField()
    athleticism_rating = models.FloatField(null=True, blank=True)
    rolling_rating = models.FloatField(null=True, blank=True)
    awareness_rating = models.FloatField(null=True, blank=True)
    decision_rating = models.FloatField(null=True, blank=True)
    effort_rating = models.FloatField(null=True, blank=True)
    comments = models.TextField(default="", blank=True)

    def __str__(self):
        return f"{self.rater.get_name()} rated {self.ratee.get_name()} {self.rating} on {self.date}"


class CalibrationParams(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    ratee_improvement = models.FloatField(blank=True, null=True)
    ratee_offset = models.FloatField(blank=True, null=True)
    rater_scale = models.FloatField(blank=True, null=True)
    rater_offset = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.ballkid.get_name()} with improvement {self.ratee_improvement} and offset {self.ratee_offset}, reviewer scale {self.rater_scale} and offset {self.rater_offset}"

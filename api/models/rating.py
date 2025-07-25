from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from api.models.ballkid import Ballkid
from api.models.enums import RATING_STATUS

from datetime import datetime


class Rating(models.Model):
    created_at = models.DateTimeField(null=True, blank=True)
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
    status = models.CharField(
        max_length=10, choices=RATING_STATUS.choices, default=RATING_STATUS.COMPLETE
    )

    def __str__(self):
        return f"{self.status}: {self.rater.get_name()} rated {self.ratee.get_name()} {self.rating} on {self.date}"


class CalibrationParams(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    year = models.IntegerField()
    ratee_improvement = models.FloatField(blank=True, null=True)
    ratee_offset = models.FloatField(blank=True, null=True)
    ratee_raw_avg = models.FloatField(blank=True, null=True)
    ratee_raw_stdev = models.FloatField(blank=True, null=True)
    ratee_calibrated_avg = models.FloatField(blank=True, null=True)
    ratee_calibrated_stdev = models.FloatField(blank=True, null=True)
    ratee_calibrated_avg_unexcluded = models.FloatField(blank=True, null=True)
    ratee_calibrated_stdev_unexcluded = models.FloatField(blank=True, null=True)

    rater_raw_avg = models.FloatField(blank=True, null=True)
    rater_raw_stdev = models.FloatField(blank=True, null=True)
    rater_scale = models.FloatField(blank=True, null=True)
    rater_offset = models.FloatField(blank=True, null=True)
    rater_distance_to_ideal = models.FloatField(blank=True, null=True)

    num_rater_ratings = models.IntegerField(default=0)
    num_ratee_ratings = models.IntegerField(default=0)
    num_ratee_ratings_unexcluded = models.IntegerField(default=0)
    num_raters = models.IntegerField(default=0)
    num_raters_unexcluded = models.IntegerField(default=0)

    class Meta:
        unique_together = ("ballkid", "year")

    def __str__(self):
        return f"{self.year}: {self.ballkid.get_name()} with improvement {self.ratee_improvement} and offset {self.ratee_offset}, reviewer scale {self.rater_scale} and offset {self.rater_offset}"

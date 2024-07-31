from django.db import models
from django.utils.translation import gettext_lazy as _
from datetime import datetime
from api.utils.utils import *


class COURT(models.TextChoices):
    STADIUM = "Stadium"
    FOUR = "Court 4"
    HARRIS = "Harris"
    FIVE = "Court 5"
    GRANDSTAND = "Grandstand"


class Schedule(models.Model):
    start = models.DateTimeField(default=datetime.now)
    end = models.DateTimeField(blank=True, null=True)
    team = models.IntegerField(default=0)
    court = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Team {self.team} on {self.court} at {self.start}"


class Tournament(models.Model):
    year = models.IntegerField(default=0)
    start_date = models.DateField(null=True)
    end_date = models.DateField(null=True)

    show_teams = models.BooleanField(default=False)
    show_finals_teams = models.BooleanField(default=False)
    on_rain_delay = models.BooleanField(default=False)

    rcal_ignore_outliers = models.FloatField(default=1.5)
    rcal_year_threshold = models.IntegerField(default=2000)
    rcal_bucket_size = models.IntegerField(default=3)

    def __str__(self):
        return f"Year {self.year} with show_teams {self.show_teams}, show_finals_teams {self.show_finals_teams}, and on_rain_delay {self.on_rain_delay}"

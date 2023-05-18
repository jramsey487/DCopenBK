from django.db import models
from django.utils.translation import gettext_lazy as _
from datetime import datetime
from api.utils import *


class COURT(models.TextChoices):
    STADIUM = "Stadium"
    HARRIS = "Harris"
    GRANDSTAND = "Grandstand"
    FOUR = "Court 4"
    FIVE = "Court 5"


class Schedule(models.Model):
    start = models.DateTimeField(default=datetime.now)
    end = models.DateTimeField(blank=True, null=True)
    team = models.IntegerField(default=0)
    court = models.CharField(max_length=10, choices=COURT.choices)

    def get_day_str(self):
        return datetime.strftime(self.start, HYPHEN_YEAR_MONTH_DAY_FORMAT_STR)

    def get_hour_str(self):
        return datetime.strftime(self.start, HOUR_COLON_MINUTE_FORMAT_STR)

    def __str__(self):
        return f"Team {self.team} on {self.court} at {self.start}"


class Tournament(models.Model):
    year = models.IntegerField(default=0)
    start_date = models.DateField(null=True)
    end_date = models.DateField(null=True)

    show_teams = models.BooleanField(default=False)
    show_finals_teams = models.BooleanField(default=False)
    on_rain_delay = models.BooleanField(default=False)

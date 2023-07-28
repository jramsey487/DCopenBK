from django.db import models
from django.utils.translation import gettext_lazy as _
from datetime import datetime
from api.utils import *


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

    banner1 = models.TextField(default="", blank=True)
    banner2 = models.TextField(default="", blank=True)
    banner3 = models.TextField(default="", blank=True)
    show_teams = models.BooleanField(default=False)
    show_finals_teams = models.BooleanField(default=False)
    on_rain_delay = models.BooleanField(default=False)

    def __str__(self):
        return f"Year {self.year} with show_teams {self.show_teams}, show_finals_teams {self.show_finals_teams}, and on_rain_delay {self.on_rain_delay}"

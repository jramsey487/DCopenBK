from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient

from api.utils.consts import *

from datetime import datetime, timedelta, date
import logging

logger = logging.getLogger("api.utils")


def setup_testing_client(name="chairperson"):
    user = User.objects.create(username=name)
    user.groups.add(Group.objects.create(name=name))
    user.save()

    client = APIClient()
    client.force_authenticate(user=user)
    return client


def get_current_year():
    return datetime.now().year


def get_tournament_age_reference_date(year=None):
    """Age is measured as of that year's tournament start date.

    If no tournament (or no start_date) exists yet, July 23 is used.
    """
    if year is None:
        year = get_current_year()
    from api.models.schedule import Tournament

    tournament = Tournament.objects.filter(year=year).first()
    start = getattr(tournament, "start_date", None) if tournament else None
    if start:
        if isinstance(start, datetime):
            return datetime(start.year, start.month, start.day)
        return datetime(start.year, start.month, start.day)
    return datetime(year, 7, 23)


def calculate_ballkid_age(date_of_birth, year=None):
    """
    Tournament age from date of birth, as of that year's tournament start date
    (defaults to the current calendar year; July 23 if no start date is set).
    """
    reference = get_tournament_age_reference_date(year).date()
    if isinstance(date_of_birth, datetime):
        dob = date_of_birth.date()
    elif isinstance(date_of_birth, date):
        dob = date_of_birth
    else:
        raise TypeError("date_of_birth must be a date or datetime")
    return int((reference - dob).days // 365.2425)


def refresh_ballkid_ages(year=None):
    """Recompute stored age for every ballkid with a date of birth."""
    from api.models.ballkid import Ballkid

    for ballkid in Ballkid.objects.exclude(date_of_birth=None):
        age = calculate_ballkid_age(ballkid.date_of_birth, year=year)
        if ballkid.age != age:
            Ballkid.objects.filter(pk=ballkid.pk).update(age=age)


def get_first_name(full_name):
    return " ".join(full_name.split(" ")[:-1])


def get_last_name(full_name):
    return full_name.split(" ")[-1]


def calc_overlapping_time(start1, end1, start2, end2):
    """
    Calculate overlapping time between 2 time ranges (defined by start and end datetimes).
    If either end time is None, then return a 0 timedelta (aka do not include any time
    from an ongoing shift)

    Arguments:
    start1(datetime): start time for first time interval
    end1(datetime): end time for first time interval
    start2(datetime): start time for second time interval
    end2(datetime): end time for second time interval
    """
    if end1 is None or end2 is None:
        return timedelta()

    if end1 <= start2 or end2 <= start1:
        return timedelta()

    end = min(end1, end2)
    start = max(start1, start2)

    return end - start


def timedelta_to_str(delta):
    """
    Converts a timedelta object into a string of the form: "xx hrs yy mins"
    If no timedelta object provided (None), "0 hrs 0 mins" is outputted
    """
    if delta is None:
        return "0 hrs 0 mins"

    hours, remainder = divmod(delta.total_seconds(), 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{int(hours)} hrs {int(minutes)} mins"


def datetime_str_to_datetime(input_str, format_str="%Y-%m-%d %H:%M:%S"):
    """
    Converts a string to a datetime object.

    Input string is of the form:
        {year}-{month}-{day}T{hours}:{minutes}:{seconds}.{milliseconds}

    For different formats of the year and/or time, format_str can be customized.
    Note that this function as it is currently built ALWAYS ASSUMES "T" to split
    up the date and time. Milliseconds after "." is optional in the input_str
    """
    if not input_str:
        return

    splitted = input_str.split("T")
    date = splitted[0]
    time = splitted[1].split(".")[0]

    return datetime.strptime(f"{date} {time}", format_str)

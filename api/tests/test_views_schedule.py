from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models.schedule import Schedule
from api.models.enums import COURT
from api.utils.utils import setup_testing_client
from api.utils.consts import T_YEAR_MONTH_DAY_FORMAT_STR

from datetime import datetime, timedelta


class TestShiftSchedule(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()
        self.start = datetime(2026, 8, 5, 11, 0, 0)
        self.hour_str = self.start.strftime(T_YEAR_MONTH_DAY_FORMAT_STR)

        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=self.start
        )
        Schedule.objects.create(
            team=2, court=COURT.STADIUM, start=self.start + timedelta(hours=1)
        )
        Schedule.objects.create(
            team=3, court=COURT.STADIUM, start=self.start + timedelta(hours=2)
        )

    def test_down_then_up_restores_hourly_starts(self):
        response = self.client.patch(
            reverse("shift-schedule"),
            {"direction": "down", "hour": self.hour_str},
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        starts = list(
            Schedule.objects.order_by("start").values_list("start", "team")
        )
        self.assertEqual(
            [
                (self.start, 0),
                (self.start + timedelta(minutes=30), 1),
                (self.start + timedelta(hours=1, minutes=30), 2),
                (self.start + timedelta(hours=2, minutes=30), 3),
            ],
            starts,
        )

        response = self.client.patch(
            reverse("shift-schedule"),
            {
                "direction": "up",
                "hour": (self.start + timedelta(minutes=30)).strftime(
                    T_YEAR_MONTH_DAY_FORMAT_STR
                ),
            },
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        starts = list(
            Schedule.objects.order_by("start").values_list("start", "team")
        )
        self.assertEqual(
            [
                (self.start, 1),
                (self.start + timedelta(hours=1), 2),
                (self.start + timedelta(hours=2), 3),
            ],
            starts,
        )

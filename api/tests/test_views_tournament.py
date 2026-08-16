from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models.ballkid import Ballkid
from api.models.schedule import Tournament
from api.utils.utils import get_current_year, setup_testing_client
from api.views.schedule import parse_tournament_date


class TestParseTournamentDate(TestCase):
    def test_iso_date(self):
        self.assertEqual(parse_tournament_date("2026-07-19"), date(2026, 7, 19))

    def test_iso_datetime_uses_calendar_prefix(self):
        self.assertEqual(
            parse_tournament_date("2026-07-19T04:00:00.000Z"),
            date(2026, 7, 19),
        )

    def test_rejects_garbage(self):
        self.assertIsNone(parse_tournament_date("nope"))


class TestGetTournament(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()
        self.year = get_current_year()

    def test_create_with_iso_dates(self):
        response = self.client.post(
            reverse("get-tournament"),
            {"year": self.year, "start": "2026-07-18", "end": "2026-07-26"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year)
        self.assertEqual(tournament.start_date, date(2026, 7, 18))
        self.assertEqual(tournament.end_date, date(2026, 7, 26))
        self.assertEqual(response.data["start_date"], "2026-07-18")
        self.assertEqual(response.data["end_date"], "2026-07-26")

    def test_patch_dates(self):
        Tournament.objects.create(
            year=self.year,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )
        response = self.client.patch(
            reverse("get-tournament"),
            {"start_date": "2026-07-19", "end_date": "2026-07-27"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year)
        self.assertEqual(tournament.start_date, date(2026, 7, 19))
        self.assertEqual(tournament.end_date, date(2026, 7, 27))

    def test_patch_start_date_refreshes_ages(self):
        Tournament.objects.create(
            year=self.year,
            start_date=date(self.year, 7, 23),
            end_date=date(self.year, 7, 31),
        )
        dob = date(self.year - 14, 7, 20)
        ballkid = Ballkid.objects.create(
            first_name="Age",
            last_name="Kid",
            date_of_birth=dob,
        )
        self.assertEqual(ballkid.age, 14)

        response = self.client.patch(
            reverse("get-tournament"),
            {
                "start_date": f"{self.year}-07-19",
                "end_date": f"{self.year}-07-27",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ballkid.refresh_from_db()
        self.assertEqual(ballkid.age, 13)

    def test_rejects_inverted_range(self):
        response = self.client.post(
            reverse("get-tournament"),
            {"year": self.year, "start": "2026-07-26", "end": "2026-07-18"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Tournament.objects.filter(year=self.year).exists())

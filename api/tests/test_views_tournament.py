from datetime import date

from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models.ballkid import Ballkid
from api.models.schedule import Schedule, Tournament
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

    def test_patch_operational_alert_email(self):
        Tournament.objects.create(
            year=self.year,
            start_date=date(self.year, 7, 18),
            end_date=date(self.year, 7, 26),
        )
        response = self.client.patch(
            reverse("get-tournament"),
            {"operational_alert_email": "alerts@example.org"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year)
        self.assertEqual(tournament.operational_alert_email, "alerts@example.org")
        settings_response = self.client.get(reverse("get-tournament"))
        self.assertEqual(settings_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            settings_response.data["operational_alert_email"], "alerts@example.org"
        )

    def test_patch_rejects_invalid_operational_alert_email(self):
        tournament = Tournament.objects.create(
            year=self.year,
            start_date=date(self.year, 7, 18),
            end_date=date(self.year, 7, 26),
            operational_alert_email="existing@example.org",
        )
        response = self.client.patch(
            reverse("get-tournament"),
            {"operational_alert_email": "not-an-email"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        tournament.refresh_from_db()
        self.assertEqual(tournament.operational_alert_email, "existing@example.org")

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

    def test_create_uses_start_date_year_instead_of_submitted_year(self):
        response = self.client.post(
            reverse("get-tournament"),
            {
                "year": self.year,
                "start_date": f"{self.year + 1}-03-10",
                "end_date": f"{self.year + 1}-03-18",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year + 1)
        self.assertEqual(tournament.start_date, date(self.year + 1, 3, 10))
        self.assertFalse(Tournament.objects.filter(year=self.year).exists())

    def test_patch_rekeys_tournament_to_start_date_year(self):
        Tournament.objects.create(
            year=self.year,
            start_date=date(self.year, 7, 18),
            end_date=date(self.year, 7, 26),
        )
        response = self.client.patch(
            reverse("get-tournament"),
            {
                "start_date": f"{self.year + 1}-03-10",
                "end_date": f"{self.year + 1}-03-18",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year + 1)
        self.assertEqual(tournament.start_date, date(self.year + 1, 3, 10))
        self.assertEqual(tournament.end_date, date(self.year + 1, 3, 18))
        self.assertFalse(Tournament.objects.filter(year=self.year).exists())


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


    def test_create_saves_detected_tournament_timezone(self):
        response = self.client.post(
            reverse("get-tournament"),
            {
                "year": self.year,
                "start": "2026-07-18",
                "end": "2026-07-26",
                "timezone": "America/Los_Angeles",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year)
        self.assertEqual(tournament.timezone, "America/Los_Angeles")
        self.assertEqual(response.data["timezone"], "America/Los_Angeles")

    def test_create_rejects_invalid_timezone(self):
        response = self.client.post(
            reverse("get-tournament"),
            {
                "year": self.year,
                "start": "2026-07-18",
                "end": "2026-07-26",
                "timezone": "Mars/Olympus_Mons",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Tournament.objects.filter(year=self.year).exists())

    def test_patch_updates_timezone(self):
        Tournament.objects.create(
            year=self.year,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )
        response = self.client.patch(
            reverse("get-tournament"),
            {"timezone": "Europe/London"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tournament = Tournament.objects.get(year=self.year)
        self.assertEqual(tournament.timezone, "Europe/London")

    def test_patch_rejects_invalid_timezone_without_saving(self):
        tournament = Tournament.objects.create(
            year=self.year,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )
        response = self.client.patch(
            reverse("get-tournament"),
            {"timezone": "Not/A_Real_Zone"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        tournament.refresh_from_db()
        self.assertEqual(tournament.timezone, "America/New_York")


    def test_timezone_cannot_change_after_shifts_exist(self):
        tournament = Tournament.objects.create(
            year=self.year,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )
        Schedule.objects.create(start=timezone.now(), court="Stadium")
        response = self.client.patch(
            reverse("get-tournament"),
            {"timezone": "Europe/London"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        tournament.refresh_from_db()
        self.assertEqual(tournament.timezone, "America/New_York")

    def test_rejects_inverted_range(self):
        response = self.client.post(
            reverse("get-tournament"),
            {"year": self.year, "start": "2026-07-26", "end": "2026-07-18"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Tournament.objects.filter(year=self.year).exists())

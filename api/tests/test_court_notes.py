from django.urls import reverse
from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from api.models.schedule import Schedule, CourtNote
from api.models.ballkid import Ballkid
from api.models.enums import COURT
from api.utils.utils import setup_testing_client
from api.utils.consts import SLASH_MONTH_DAY_YEAR_FORMAT_STR

from datetime import datetime, date


class TestCourtNotes(APITestCase):
    def setUp(self):
        self.client = setup_testing_client("chairperson")
        self.date = date(2026, 8, 5)
        self.date_str = self.date.strftime(SLASH_MONTH_DAY_YEAR_FORMAT_STR)
        self.url = reverse("court-notes")

    def test_put_upsert_and_get_filtered_by_date(self):
        response = self.client.put(
            self.url,
            {
                "court": COURT.STADIUM,
                "date": self.date_str,
                "message": "Wet surface",
            },
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, CourtNote.objects.count())
        self.assertEqual("Wet surface", response.data["message"])

        response = self.client.put(
            self.url,
            {
                "court": COURT.STADIUM,
                "date": self.date_str,
                "message": "Gate B only",
            },
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, CourtNote.objects.count())
        note = CourtNote.objects.get()
        self.assertEqual("Gate B only", note.message)
        self.assertEqual(self.date, note.date)

        CourtNote.objects.create(
            court=COURT.GRANDSTAND,
            date=date(2026, 8, 6),
            message="Tomorrow only",
        )

        response = self.client.get(self.url, {"date": self.date_str})
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, len(response.data))
        self.assertEqual(COURT.STADIUM, response.data[0]["court"])
        self.assertEqual("Gate B only", response.data[0]["message"])

    def test_put_empty_message_deletes(self):
        CourtNote.objects.create(
            court=COURT.STADIUM, date=self.date, message="Remove me"
        )
        response = self.client.put(
            self.url,
            {
                "court": COURT.STADIUM,
                "date": self.date_str,
                "message": "",
            },
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(0, CourtNote.objects.count())
        self.assertEqual("", response.data["message"])

    def test_unique_court_date(self):
        CourtNote.objects.create(
            court=COURT.STADIUM, date=self.date, message="One"
        )
        with self.assertRaises(Exception):
            CourtNote.objects.create(
                court=COURT.STADIUM, date=self.date, message="Two"
            )

    def test_ballkid_can_read_but_not_write(self):
        CourtNote.objects.create(
            court=COURT.STADIUM, date=self.date, message="Visible"
        )
        user = User.objects.create(username="ballkid_user")
        user.groups.add(Group.objects.create(name="ballkid"))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(self.url, {"date": self.date_str})
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, len(response.data))
        self.assertEqual("Visible", response.data[0]["message"])

        response = client.put(
            self.url,
            {
                "court": COURT.STADIUM,
                "date": self.date_str,
                "message": "Nope",
            },
            format="json",
        )
        self.assertEqual(status.HTTP_403_FORBIDDEN, response.status_code)
        self.assertEqual(
            "Visible", CourtNote.objects.get().message
        )

    def test_captain_allowed_on_own_team_court(self):
        user = User.objects.create(username="captain_user")
        user.groups.add(Group.objects.create(name="captain"))
        Ballkid.objects.create(
            first_name="Cap",
            last_name="Tain",
            user=user,
            is_captain=True,
            current_team=1,
            is_checked_in=True,
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2026, 8, 5, 11, 0, 0),
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.put(
            self.url,
            {
                "court": COURT.STADIUM,
                "date": self.date_str,
                "message": "Captain note",
            },
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, CourtNote.objects.count())

        response = client.get(self.url, {"date": self.date_str})
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, len(response.data))

    def test_captain_cannot_edit_other_team_court(self):
        user = User.objects.create(username="captain_user")
        user.groups.add(Group.objects.create(name="captain"))
        Ballkid.objects.create(
            first_name="Cap",
            last_name="Tain",
            user=user,
            is_captain=True,
            current_team=1,
            is_checked_in=True,
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2026, 8, 5, 11, 0, 0),
        )
        Schedule.objects.create(
            team=2,
            court=COURT.GRANDSTAND,
            start=datetime(2026, 8, 5, 11, 0, 0),
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.put(
            self.url,
            {
                "court": COURT.GRANDSTAND,
                "date": self.date_str,
                "message": "Nope",
            },
            format="json",
        )
        self.assertEqual(status.HTTP_403_FORBIDDEN, response.status_code)
        self.assertEqual(0, CourtNote.objects.count())

    def test_court_rename_updates_note(self):
        CourtNote.objects.create(
            court=COURT.STADIUM, date=self.date, message="Follow me"
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2026, 8, 5, 11, 0, 0),
        )

        response = self.client.patch(
            reverse("update-court-name"),
            {
                "oldName": COURT.STADIUM,
                "newName": "Court 1",
                "date": self.date_str,
            },
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(0, CourtNote.objects.filter(court=COURT.STADIUM).count())
        note = CourtNote.objects.get()
        self.assertEqual("Court 1", note.court)
        self.assertEqual("Follow me", note.message)

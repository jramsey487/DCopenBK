from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from api.models.action_log import ActionLog
from api.models.ballkid import Ballkid
from api.models.schedule import Tournament
from api.utils.utils import get_current_year, setup_testing_client


class AuditLogTests(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()  # chairperson
        # Ballkid.set_field("finals_*") looks up this year's tournament.
        Tournament.objects.create(year=get_current_year())

    def test_checkin_is_logged_with_actor(self):
        Ballkid.objects.create(first_name="Ann", last_name="Lee")
        ActionLog.objects.all().delete()

        response = self.client.patch(
            reverse("update-ballkid"),
            {"first_name": "Ann", "last_name": "Lee", "is_checked_in": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log = ActionLog.objects.get(action="ballkid.checkin")
        self.assertEqual(log.actor_name, "chairperson")
        self.assertEqual(log.target_name, "Ann Lee")
        self.assertEqual(log.category, "checkin")

    def test_bulk_checkout_collapses_into_one_row(self):
        for name in ("A", "B", "C"):
            Ballkid.objects.create(
                first_name=name, last_name="Kid", is_checked_in=True
            )
        ActionLog.objects.all().delete()

        response = self.client.patch(
            reverse("checkout-all"), {"checkout_group": "all"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log = ActionLog.objects.get(action="ballkid.checkout")
        self.assertEqual(log.count, 3)
        self.assertEqual(len(log.items), 3)

    def test_archive_all_logs_headline_and_people(self):
        Ballkid.objects.create(first_name="A", last_name="Kid")
        Ballkid.objects.create(first_name="B", last_name="Kid")
        ActionLog.objects.all().delete()

        response = self.client.patch(reverse("archive-all"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(ActionLog.objects.filter(action="season.archive_all").exists())
        self.assertEqual(ActionLog.objects.get(action="ballkid.archive").count, 2)

    def test_viewer_is_chairperson_only(self):
        plain = APIClient()
        plain.force_authenticate(user=User.objects.create(username="plain"))
        self.assertEqual(
            plain.get(reverse("action-log")).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        response = self.client.get(reverse("action-log"), {"category": "checkin"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("categories", response.data)

    def test_rollover_status_shape(self):
        response = self.client.get(reverse("season-rollover"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ("year", "export", "tournament", "archive", "reset", "applications"):
            self.assertIn(key, response.data)
        self.assertTrue(response.data["tournament"]["exists"])

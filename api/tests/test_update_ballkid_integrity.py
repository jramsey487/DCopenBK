from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models.ballkid import Ballkid
from api.models.schedule import Tournament
from api.utils.utils import get_current_year, setup_testing_client


class TestUpdateBallkidIntegrity(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()
        # Ballkid.validate() expects a Tournament row for the current season.
        Tournament.objects.create(year=get_current_year())
        self.first = Ballkid.objects.create(
            first_name="Alex", last_name="Smith", comments="first record"
        )
        self.second = Ballkid.objects.create(
            first_name="Alex", last_name="Smith", comments="second record"
        )
        self.url = reverse("update-ballkid")

    def test_id_updates_the_exact_record_when_names_are_duplicated(self):
        response = self.client.patch(
            self.url,
            {"ballkid_id": self.second.id, "comments": "updated second"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.first.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual(self.first.comments, "first record")
        self.assertEqual(self.second.comments, "updated second")

    def test_legacy_name_request_rejects_ambiguous_duplicate_names(self):
        response = self.client.patch(
            self.url,
            {
                "first_name": "Alex",
                "last_name": "Smith",
                "comments": "must not update either record",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.first.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual(self.first.comments, "first record")
        self.assertEqual(self.second.comments, "second record")

    def test_failure_rolls_back_all_changes_from_patch(self):
        with patch.object(
            Ballkid, "validate", side_effect=RuntimeError("forced rollback")
        ):
            with self.assertRaises(RuntimeError):
                self.client.patch(
                    self.url,
                    {
                        "ballkid_id": self.second.id,
                        "comments": "partial update must roll back",
                    },
                    format="json",
                )

        self.second.refresh_from_db()
        self.assertEqual(self.second.comments, "second record")

from django.contrib.auth.models import Group, User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from api.models.ballkid import Ballkid, SeasonParticipation
from api.views.application import ApplicationVeterancyRosterView


class TestApplicationVeterancyRosterView(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="launch-chair", email="chair@example.com", password="test"
        )
        chairperson_group, _ = Group.objects.get_or_create(name="chairperson")
        self.user.groups.add(chairperson_group)

        self.ballkid = Ballkid.objects.create(
            first_name="Taylor",
            last_name="Volunteer",
            user=self.user,
            veterancy_baseline_years=5,
            veterancy_baseline_through_year=2025,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2025,
            source=SeasonParticipation.SOURCE_IMPORTED,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2026,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )

    def test_returns_checkin_roster_and_veterancy_as_of_requested_year(self):
        request = self.factory.get(
            "/api/applications/veterancy-roster", {"year": 2026}
        )
        force_authenticate(request, user=self.user)

        response = ApplicationVeterancyRosterView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], 2026)
        self.assertEqual(response.data["count"], 1)
        person = response.data["results"][0]
        self.assertEqual(person["ballkid_id"], self.ballkid.id)
        self.assertEqual(person["historical_veterancy_years"], 5)
        self.assertEqual(person["verified_veterancy_years"], 1)
        self.assertEqual(person["veterancy_years"], 6)

    def test_requires_chairperson_or_superuser(self):
        regular_user = User.objects.create_user(
            username="regular-volunteer", password="test"
        )
        request = self.factory.get(
            "/api/applications/veterancy-roster", {"year": 2026}
        )
        force_authenticate(request, user=regular_user)

        response = ApplicationVeterancyRosterView.as_view()(request)

        self.assertEqual(response.status_code, 403)

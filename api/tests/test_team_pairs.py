from django.urls import reverse
from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from api.models.ballkid import Ballkid, TeamPair
from api.models.enums import POSITION


class TestTeamPairs(APITestCase):
    def setUp(self):
        self.url = reverse("team-pairs")

        self.captain_user = User.objects.create(username="captain")
        self.captain_user.groups.add(Group.objects.create(name="captain"))
        self.captain_user.save()

        self.other_captain_user = User.objects.create(username="othercap")
        self.other_captain_user.groups.add(Group.objects.get(name="captain"))
        self.other_captain_user.save()

        self.captain = Ballkid.objects.create(
            first_name="Cap",
            last_name="One",
            user=self.captain_user,
            is_captain=True,
            is_checked_in=True,
            current_team=1,
            position=POSITION.N,
        )
        self.net_a = Ballkid.objects.create(
            first_name="Net",
            last_name="A",
            is_checked_in=True,
            current_team=1,
            position=POSITION.N,
        )
        self.net_b = Ballkid.objects.create(
            first_name="Net",
            last_name="B",
            is_checked_in=True,
            current_team=1,
            position=POSITION.N,
        )
        self.back_a = Ballkid.objects.create(
            first_name="Back",
            last_name="A",
            is_checked_in=True,
            current_team=1,
            position=POSITION.B,
        )
        self.other_team_net = Ballkid.objects.create(
            first_name="Other",
            last_name="Net",
            is_checked_in=True,
            current_team=2,
            position=POSITION.N,
        )
        Ballkid.objects.create(
            first_name="Cap",
            last_name="Two",
            user=self.other_captain_user,
            is_captain=True,
            is_checked_in=True,
            current_team=2,
            position=POSITION.N,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.captain_user)

    def test_captain_can_create_and_delete_pair_on_own_team(self):
        response = self.client.post(
            self.url,
            {
                "team": 1,
                "position": "Net",
                "ballkid_a": self.net_a.id,
                "ballkid_b": self.net_b.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(1, TeamPair.objects.count())
        pair_id = response.data["id"]

        response = self.client.delete(
            self.url, {"id": pair_id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, TeamPair.objects.count())

    def test_captain_cannot_edit_other_team(self):
        response = self.client.post(
            self.url,
            {
                "team": 2,
                "position": "Net",
                "ballkid_a": self.other_team_net.id,
                "ballkid_b": self.net_a.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rejects_cross_position_pair(self):
        response = self.client.post(
            self.url,
            {
                "team": 1,
                "position": "Net",
                "ballkid_a": self.net_a.id,
                "ballkid_b": self.back_a.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(0, TeamPair.objects.count())

    def test_list_pairs(self):
        TeamPair.objects.create(
            team=1,
            position=POSITION.N,
            ballkid_a=self.net_a,
            ballkid_b=self.net_b,
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(response.data))

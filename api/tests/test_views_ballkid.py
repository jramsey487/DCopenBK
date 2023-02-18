from django.urls import reverse
from rest_framework import status
from django.contrib.auth.models import User, Group
from rest_framework.test import APITestCase, APIClient, force_authenticate
from api.models.ballkid import Ballkid
from api.serializers import BallkidSerializer


class TestBallkidListView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        user.is_staff = True
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy", last_name="Iosue", num_years_experience=3
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea", last_name="Losue", is_captain=True
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe", last_name="Iosue", num_years_experience=2
        )
        self.ballkid4 = Ballkid.objects.create(
            first_name="Dino", last_name="Iosue", is_active=False
        )
        self.ballkid5 = Ballkid.objects.create(
            first_name="Dinosaur",
            last_name="Iosue",
            is_active=True,
            is_cut=True,
        )

    def test_list(self):
        response = self.client.get(reverse("list"))
        ballkids = [self.ballkid3, self.ballkid1, self.ballkid2]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_sorted_list(self):
        response = self.client.get(reverse("sorted-list"))
        ballkids = [self.ballkid2, self.ballkid1, self.ballkid3]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_cut_list(self):
        response = self.client.get(reverse("list"))
        ballkids = [self.ballkid3, self.ballkid1, self.ballkid2]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_cut_list(self):
        response = self.client.get(reverse("all-list"))
        ballkids = [self.ballkid5, self.ballkid3, self.ballkid1, self.ballkid2]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_archived_list(self):
        response = self.client.get(reverse("archived-list"))
        ballkids = [self.ballkid4]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)


class TestCreateBallkidView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("create-ballkid")

    def test_new_ballkid(self):
        data = {
            "first_name": "Lacy",
            "last_name": "Iosue",
            "age": 20,
            "preferred_position": "Back/Net",
            "is_captain": True,
            "num_years_experience": 3,
        }
        response = self.client.post(
            self.url,
            data,
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(1, len(Ballkid.objects.all()))

        ballkid = Ballkid.objects.all()[0]
        self.assertEqual(20, ballkid.age)
        self.assertEqual("Back/Net", ballkid.preferred_position)
        self.assertTrue(ballkid.is_captain)
        self.assertEqual(3, ballkid.num_years_experience)
        self.assertEqual("api/static/img/none.jpg", ballkid.image)

    def test_existing_ballkid(self):
        Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.assertEqual(1, len(Ballkid.objects.all()))
        ballkid = Ballkid.objects.all()[0]
        self.assertEqual(0, ballkid.age)
        self.assertEqual("Back", ballkid.preferred_position)
        self.assertFalse(ballkid.is_captain)
        self.assertEqual(0, ballkid.num_years_experience)
        self.assertEqual("api/static/img/none.jpg", ballkid.image)

        data = {
            "first_name": "Lacy",
            "last_name": "Iosue",
            "age": 20,
            "preferred_position": "Back/Net",
            "is_captain": True,
            "num_years_experience": 3,
        }
        self.client.post(
            self.url,
            data,
            format="json",
        )

        self.assertEqual(1, len(Ballkid.objects.all()))


class TestGetBallkidView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy", last_name="Iosue", num_years_experience=3
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea", last_name="Losue", is_captain=True
        )

    def test_exists(self):
        response = self.client.get(
            reverse("get-ballkid", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = BallkidSerializer(self.ballkid1)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(serializer.data, response.data)

    def test_not_exists(self):
        response = self.client.get(
            reverse("get-ballkid", kwargs={"pk": 0}), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestUpdateBallkidView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("update-ballkid")

        self.ballkid = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=False,
            position="Net",
            current_team=0,
            preferred_position="Net/Back",
        )

    def test_name_not_provided(self):
        response = self.client.patch(self.url, {"is_checked_in": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_last_name_not_provided(self):
        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "is_checked_in": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_name_not_matching(self):
        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Missing", "is_checked_in": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_checkin_status(self):
        self.assertFalse(self.ballkid.is_checked_in)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "is_checked_in": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_checked_in)

    def test_update_team(self):
        self.assertEqual(0, self.ballkid.current_team)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_checked_in": True,
                "current_team": 1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(1, self.ballkid.current_team)

    def test_update_preferred_position(self):
        self.assertEqual("Net/Back", self.ballkid.preferred_position)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "preferred_position": "Back/Net",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual("Back/Net", self.ballkid.preferred_position)

    def test_update_position(self):
        self.assertEqual("Net", self.ballkid.position)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_checked_in": True,
                "current_team": 1,
                "position": "Back",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual("Back", self.ballkid.position)

    def test_checkout_removes_team(self):
        self.ballkid.is_checked_in = True
        self.ballkid.current_team = 2
        self.ballkid.save()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_checked_in": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(0, self.ballkid.current_team)

    def test_checkout_resets_position(self):
        self.ballkid.is_checked_in = True
        self.ballkid.position = "Back"
        self.ballkid.current_team = 2
        self.ballkid.save()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_checked_in": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual("Net", self.ballkid.position)

    def test_unassign_resets_position(self):
        self.ballkid.is_checked_in = True
        self.ballkid.position = "Back"
        self.ballkid.current_team = 2
        self.ballkid.save()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "current_team": 0,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual("Net", self.ballkid.position)


class TestCheckoutAllView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("checkout-all")

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.ballkid3 = Ballkid.objects.create(first_name="Joe", last_name="Iosue")

    def test_none_checked_in(self):
        response = self.client.patch(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, len(Ballkid.objects.all().filter(is_checked_in=True)))

    def test_some_checked_in(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid1.save()
        self.ballkid2.save()
        self.assertEqual(2, len(Ballkid.objects.all().filter(is_checked_in=True)))

        response = self.client.patch(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, len(Ballkid.objects.all().filter(is_checked_in=True)))


class TestCalcNumTeamsView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("calc-num-teams")

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=True,
            current_team=1,
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea",
            last_name="Losue",
            is_checked_in=True,
            current_team=2,
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
            is_checked_in=True,
            current_team=1,
        )

    def test_none_checked_in(self):
        self.client.patch(reverse("checkout-all"), {}, format="json")

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, response.data["num_teams"])

    def test_all_checked_in(self):
        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(2, response.data["num_teams"])

    def test_some_checked_in(self):
        self.ballkid1.is_checked_in = False
        self.ballkid1.save()
        self.ballkid1.validate()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(2, response.data["num_teams"])

    def test_empty_maximal_team(self):
        self.ballkid2.is_checked_in = False
        self.ballkid2.save()
        self.ballkid2.validate()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(1, response.data["num_teams"])

    def test_empty_nonmaximal_team(self):
        self.ballkid1.is_checked_in = False
        self.ballkid3.is_checked_in = False
        self.ballkid1.save()
        self.ballkid3.save()
        self.ballkid1.validate()
        self.ballkid3.validate()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(2, response.data["num_teams"])


class TestClearTeamView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("clear-team")

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=True,
            current_team=1,
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea",
            last_name="Losue",
            is_checked_in=True,
            current_team=1,
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
            is_checked_in=True,
            current_team=2,
        )

    def test_nonexisting_team(self):
        response = self.client.patch(self.url, {"current_team": 3}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(3, len(Ballkid.objects.all().filter(current_team__gt=0)))

    def test_no_arg(self):
        response = self.client.patch(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_multiple_on_team(self):
        response = self.client.patch(self.url, {"current_team": 1}, format="json")
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, self.ballkid1.current_team)
        self.assertEqual(0, self.ballkid2.current_team)
        self.assertEqual(2, self.ballkid3.current_team)
        self.assertEqual(3, len(Ballkid.objects.all().filter(is_checked_in=True)))
        self.assertEqual(1, len(Ballkid.objects.all().filter(current_team__gt=0)))

    def test_one_on_team(self):
        response = self.client.patch(self.url, {"current_team": 2}, format="json")
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(1, self.ballkid1.current_team)
        self.assertEqual(1, self.ballkid2.current_team)
        self.assertEqual(0, self.ballkid3.current_team)
        self.assertEqual(3, len(Ballkid.objects.all().filter(is_checked_in=True)))
        self.assertEqual(2, len(Ballkid.objects.all().filter(current_team__gt=0)))


class TestCalcTotalTimeView(APITestCase):
    pass


class TestCheckinHistoryView(APITestCase):
    pass


class TestCaptainAnalyticsView(APITestCase):
    pass

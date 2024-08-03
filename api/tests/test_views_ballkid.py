from django.urls import reverse
from django.db.models import Max
from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from api.models.ballkid import Ballkid, MATCH_TYPE, POSITION, CUT_STATUS
from api.models.schedule import Tournament
from api.models.rating import Rating
from api.views.rating import save_calibration_parameters
from api.serializers import BallkidSerializer
from api.utils.utils import *
from api.utils.consts import MATCHES_START_HOUR

from datetime import datetime, timedelta


class TestBallkidListView(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

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
            last_day=datetime.strftime(
                (datetime.now() - timedelta(hours=MATCHES_START_HOUR)), "%A"
            ),
        )
        self.ballkid6 = Ballkid.objects.create(
            first_name="Cut", last_name="Iosue", is_active=True, is_cut=True
        )

    def test_list(self):
        response = self.client.get(reverse("list"))
        ballkids = [
            self.ballkid6,
            self.ballkid5,
            self.ballkid3,
            self.ballkid1,
            self.ballkid2,
        ]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_sorted_list(self):
        response = self.client.get(reverse("sorted-list"))
        ballkids = [self.ballkid2, self.ballkid1, self.ballkid3]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            serializer.data[0]["first_name"], response.data[0]["first_name"]
        )
        self.assertEqual(
            serializer.data[1]["first_name"], response.data[1]["first_name"]
        )
        self.assertEqual(
            serializer.data[2]["first_name"], response.data[2]["first_name"]
        )

    def test_self_cut_list(self):
        response = self.client.get(reverse("self-cut-list"))

        ballkid = response.data[0]
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(self.ballkid5.first_name, ballkid["first_name"])
        self.assertEqual("Self-Cut", ballkid["cut_status"])

    def test_inactive_list(self):
        response = self.client.get(reverse("inactive-list"))
        ballkids = [self.ballkid6, self.ballkid4]
        serializer = BallkidSerializer(ballkids, many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_list_ratings(self):
        Rating.objects.create(rater=self.ballkid2, ratee=self.ballkid1, rating=5)

        response = self.client.get(
            reverse(
                "list-ratings",
                kwargs={"pk": self.ballkid2.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        annotated = response.data[0]
        self.assertEqual(self.ballkid6.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

        annotated = response.data[1]
        self.assertEqual(self.ballkid5.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

        annotated = response.data[2]
        self.assertEqual(self.ballkid3.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

        annotated = response.data[3]
        self.assertEqual(self.ballkid1.first_name, annotated["first_name"])
        self.assertEqual(1, annotated["num_ratings"])
        self.assertLess(0, annotated["num_my_ratings"])

        annotated = response.data[4]
        self.assertEqual(self.ballkid2.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

    def test_list_ratings_excludes_prev_years(self):
        Rating.objects.create(rater=self.ballkid2, ratee=self.ballkid1, rating=5)
        Rating.objects.create(
            rater=self.ballkid2,
            ratee=self.ballkid1,
            rating=5,
            date=datetime.today() - timedelta(days=365),
        )

        response = self.client.get(
            reverse(
                "list-ratings",
                kwargs={"pk": self.ballkid2.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        annotated = response.data[0]
        self.assertEqual(self.ballkid6.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

        annotated = response.data[1]
        self.assertEqual(self.ballkid5.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

        annotated = response.data[2]
        self.assertEqual(self.ballkid3.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

        annotated = response.data[3]
        self.assertEqual(self.ballkid1.first_name, annotated["first_name"])
        self.assertEqual(1, annotated["num_ratings"])
        self.assertLess(0, annotated["num_my_ratings"])

        annotated = response.data[4]
        self.assertEqual(self.ballkid2.first_name, annotated["first_name"])
        self.assertEqual(0, annotated["num_ratings"])
        self.assertEqual(0, annotated["num_my_ratings"])

    def test_sorted_list_ratings(self):
        Rating.objects.create(rater=self.ballkid2, ratee=self.ballkid1, rating=5)
        save_calibration_parameters()

        response = self.client.get(
            reverse(
                "sorted-list-ratings",
                kwargs={"pk": self.ballkid2.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        annotated1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, annotated1["first_name"])
        self.assertEqual(0, annotated1["num_ratings"])
        self.assertEqual(0, annotated1["num_my_ratings"])

        annotated2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, annotated2["first_name"])
        self.assertEqual(1, annotated2["num_ratings"])
        self.assertLess(0, annotated2["num_my_ratings"])

        annotated3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, annotated3["first_name"])
        self.assertEqual(0, annotated3["num_ratings"])
        self.assertEqual(0, annotated3["num_my_ratings"])

    def test_sorted_list_ratings_excludes_prev_years(self):
        Rating.objects.create(rater=self.ballkid2, ratee=self.ballkid1, rating=5)
        Rating.objects.create(
            rater=self.ballkid2,
            ratee=self.ballkid3,
            rating=5,
            date=datetime.today() - timedelta(days=365),
        )
        save_calibration_parameters()

        response = self.client.get(
            reverse(
                "sorted-list-ratings",
                kwargs={"pk": self.ballkid2.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        annotated1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, annotated1["first_name"])
        self.assertEqual(0, annotated1["num_ratings"])
        self.assertEqual(0, annotated1["num_my_ratings"])

        annotated2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, annotated2["first_name"])
        self.assertEqual(1, annotated2["num_ratings"])
        self.assertLess(0, annotated2["num_my_ratings"])

        annotated3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, annotated3["first_name"])
        self.assertEqual(0, annotated3["num_ratings"])
        self.assertEqual(0, annotated3["num_my_ratings"])


class TestCreateBallkidView(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.url = reverse("create-ballkid")
        self.tournament = Tournament.objects.create(
            year=get_current_year(), show_teams=True, show_finals_teams=True
        )

    def test_new_ballkid(self):
        data = {
            "first_name": "Lacy",
            "last_name": "Iosue",
            "age": 20,
            "preferred_position": POSITION.BN,
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

        ballkid = Ballkid.objects.first()
        self.assertEqual(20, ballkid.age)
        self.assertEqual(POSITION.BN, ballkid.preferred_position)
        self.assertTrue(ballkid.is_captain)
        self.assertEqual(3, ballkid.num_years_experience)
        self.assertEqual("static/img/none.jpg", ballkid.image)

    def test_new_ballkid_strip_whitespace(self):
        data = {
            "first_name": "Lacy  ",
            "last_name": "Iosue ",
            "age": 20,
            "preferred_position": POSITION.BN,
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

        ballkid = Ballkid.objects.first()
        self.assertEqual(20, ballkid.age)
        self.assertEqual(POSITION.BN, ballkid.preferred_position)
        self.assertTrue(ballkid.is_captain)
        self.assertEqual(3, ballkid.num_years_experience)
        self.assertEqual("static/img/none.jpg", ballkid.image)

    def test_existing_ballkid(self):
        Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.assertEqual(1, len(Ballkid.objects.all()))
        ballkid = Ballkid.objects.first()
        self.assertEqual(0, ballkid.age)
        self.assertEqual(POSITION.B, ballkid.preferred_position)
        self.assertFalse(ballkid.is_captain)
        self.assertEqual(0, ballkid.num_years_experience)
        self.assertEqual("static/img/none.jpg", ballkid.image)

        data = {
            "first_name": "Lacy",
            "last_name": "Iosue",
            "age": 20,
            "preferred_position": POSITION.BN,
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
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(
            first_name="Andrea", last_name="Iosue", num_years_experience=3
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Rookie", last_name="Iosue", num_years_experience=0
        )
        self.captain1 = Ballkid.objects.create(
            first_name="Lacy", last_name="Iosue", is_chairperson=True
        )
        self.captain2 = Ballkid.objects.create(
            first_name="Joe", last_name="Iosue", is_captain=True
        )
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=3)
        Rating.objects.create(rater=self.captain2, ratee=self.ballkid1, rating=5)

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

    def test_exists_ratings(self):
        response = self.client.get(
            reverse(
                "get-ballkid-ratings",
                kwargs={"pk": self.ballkid1.id, "me": self.captain1.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(0, response.data["num_my_ratings"])
        self.assertEqual(2, response.data["num_ratings"])

        response = self.client.get(
            reverse(
                "get-ballkid-ratings",
                kwargs={"pk": self.ballkid2.id, "me": self.captain2.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, response.data["num_my_ratings"])
        self.assertEqual(0, response.data["num_ratings"])

    def test_exists_ratings_exclude_prev_years(self):
        Rating.objects.create(
            rater=self.captain2,
            ratee=self.ballkid1,
            rating=5,
            date=datetime.today() - timedelta(days=365),
        )

        response = self.client.get(
            reverse(
                "get-ballkid-ratings",
                kwargs={"pk": self.ballkid1.id, "me": self.captain1.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(0, response.data["num_my_ratings"])
        self.assertEqual(2, response.data["num_ratings"])

        response = self.client.get(
            reverse(
                "get-ballkid-ratings",
                kwargs={"pk": self.ballkid2.id, "me": self.captain2.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, response.data["num_my_ratings"])
        self.assertEqual(0, response.data["num_ratings"])


class TestUpdateBallkidView(APITestCase):
    def setUp(self):
        chairperson_group = Group.objects.create(name="chairperson")
        captain_group = Group.objects.create(name="captain")
        ballkid_group = Group.objects.create(name="ballkid")

        user = User.objects.create(username="test")
        user.groups.add(chairperson_group)
        user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("update-ballkid")

        self.ballkid_user = User.objects.create(
            username="lacy.iosue", first_name="Lacy", last_name="Iosue"
        )
        self.ballkid_user.groups.add(ballkid_group)

        self.ballkid = Ballkid.objects.create(
            user=self.ballkid_user,
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=False,
            position=POSITION.N,
            current_team=0,
            preferred_position=POSITION.NB,
        )

        Tournament.objects.create(year=get_current_year(), show_finals_teams=True)

    def test_name_not_provided(self):
        self.assertRaises(
            KeyError,
            self.client.patch,
            self.url,
            {"is_checked_in": True},
            format="json",
        )

    def test_last_name_not_provided(self):
        self.assertRaises(
            KeyError,
            self.client.patch,
            self.url,
            {"first_name": "Lacy", "is_checked_in": True},
            format="json",
        )

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
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "preferred_position": POSITION.BN,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(POSITION.BN, self.ballkid.preferred_position)

    def test_update_position(self):
        self.assertEqual(POSITION.N, self.ballkid.position)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_checked_in": True,
                "current_team": 1,
                "position": POSITION.B,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(POSITION.B, self.ballkid.position)

    def test_update_finals_team(self):
        self.assertEqual("", self.ballkid.finals_team)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "finals_team": MATCH_TYPE.MD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(MATCH_TYPE.MD, self.ballkid.finals_team)

    def test_update_finals_position(self):
        self.assertEqual(POSITION.B, self.ballkid.finals_position)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "finals_position": POSITION.N},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(POSITION.N, self.ballkid.finals_position)

    def test_update_is_active(self):
        self.assertEqual(True, self.ballkid.is_active)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(False, self.ballkid.is_active)

    def test_update_is_cut(self):
        self.assertEqual(False, self.ballkid.is_cut)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "is_cut": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(True, self.ballkid.is_cut)

    def test_update_cut_status(self):
        self.assertEqual("", self.ballkid.cut_status)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "cut_status": CUT_STATUS.DEFINITELY_KEEP,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(CUT_STATUS.DEFINITELY_KEEP, self.ballkid.cut_status)

    def test_update_comments(self):
        self.assertEqual("", self.ballkid.comments)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "comments": "comments"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual("comments", self.ballkid.comments)

    def test_update_promote_to_demote_from_captain(self):
        self.assertEqual(False, self.ballkid.is_captain)
        self.assertEqual("ballkid", self.ballkid.user.groups.first().name)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "is_captain": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(True, self.ballkid.is_captain)
        self.assertEqual("captain", self.ballkid.user.groups.first().name)

        response = self.client.patch(
            self.url,
            {"first_name": "Lacy", "last_name": "Iosue", "is_captain": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ballkid.refresh_from_db()
        self.assertEqual(False, self.ballkid.is_captain)
        self.assertEqual("ballkid", self.ballkid.user.groups.first().name)

    def test_checkout_removes_team_resets_position(self):
        self.ballkid.is_checked_in = True
        self.ballkid.position = POSITION.B
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
        self.assertEqual(POSITION.N, self.ballkid.position)

    def test_unassign_resets_position(self):
        self.ballkid.is_checked_in = True
        self.ballkid.position = POSITION.B
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
        self.assertEqual(POSITION.N, self.ballkid.position)

    def test_archive_removes_team_resets_position(self):
        self.ballkid.is_active = True
        self.ballkid.position = POSITION.B
        self.ballkid.current_team = 2
        self.ballkid.save()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)

    def test_cut_removes_team_resets_position(self):
        self.ballkid.is_cut = False
        self.ballkid.position = POSITION.B
        self.ballkid.current_team = 2
        self.ballkid.save()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Lacy",
                "last_name": "Iosue",
                "is_cut": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid.refresh_from_db()
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)


class TestCheckoutAllView(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.url = reverse("checkout-all")

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy", last_name="Iosue", preferred_position=POSITION.BN
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea", last_name="Losue", preferred_position=POSITION.B
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe", last_name="Iosue", preferred_position=POSITION.NB
        )
        self.tournament = Tournament.objects.create(
            year=get_current_year(), show_teams=True, show_finals_teams=True
        )

    def test_none_checked_in(self):
        response = self.client.patch(self.url, {"checkout_group": "all"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, len(Ballkid.objects.filter(is_checked_in=True)))

    def test_some_checked_in(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid1.save()
        self.ballkid2.save()
        self.assertEqual(2, len(Ballkid.objects.filter(is_checked_in=True)))

        response = self.client.patch(self.url, {"checkout_group": "all"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, len(Ballkid.objects.filter(is_checked_in=True)))

    def test_some_checked_in_unassign_team_reset_position(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid2.current_team = 2
        self.ballkid1.position = POSITION.N
        self.ballkid2.position = POSITION.N
        self.ballkid1.save()
        self.ballkid2.save()
        self.assertEqual(2, len(Ballkid.objects.filter(is_checked_in=True)))

        response = self.client.patch(self.url, {"checkout_group": "all"}, format="json")
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(0, self.ballkid1.current_team)
        self.assertEqual(0, self.ballkid2.current_team)
        self.assertEqual(POSITION.B, self.ballkid1.position)
        self.assertEqual(POSITION.B, self.ballkid2.position)

    def test_some_checked_in_no_change_to_finals_teams(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid1.finals_team = MATCH_TYPE.MS
        self.ballkid2.finals_team = MATCH_TYPE.WS
        self.ballkid1.finals_position = POSITION.N
        self.ballkid2.finals_position = POSITION.N
        self.ballkid1.save()
        self.ballkid2.save()
        self.assertEqual(2, len(Ballkid.objects.filter(is_checked_in=True)))

        response = self.client.patch(self.url, {"checkout_group": "all"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(MATCH_TYPE.MS, self.ballkid1.finals_team)
        self.assertEqual(MATCH_TYPE.WS, self.ballkid2.finals_team)
        self.assertEqual(POSITION.N, self.ballkid1.finals_position)
        self.assertEqual(POSITION.N, self.ballkid2.finals_position)

    def test_checkout_unassigned(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()
        self.assertEqual(3, len(Ballkid.objects.filter(is_checked_in=True)))

        response = self.client.patch(
            self.url, {"checkout_group": "unassigned"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(Ballkid.objects.filter(is_checked_in=True)))

    def test_checkout_nonempty_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()
        self.assertEqual(3, len(Ballkid.objects.filter(is_checked_in=True)))

        response = self.client.patch(self.url, {"checkout_group": 1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(2, len(Ballkid.objects.filter(is_checked_in=True)))

    def test_checkout_empty_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()
        self.assertEqual(3, len(Ballkid.objects.filter(is_checked_in=True)))

        response = self.client.patch(self.url, {"checkout_group": 2}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(3, len(Ballkid.objects.filter(is_checked_in=True)))


class TestCutAllView(APITestCase):
    def setUp(self):
        user = User.objects.create(username="test")
        group = Group.objects.create(name="chairperson")
        user.groups.add(group)
        user.save()
        self.client = APIClient()
        self.client.force_authenticate(user=user)

        self.url = reverse("cut-all")

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            preferred_position=POSITION.BN,
            is_checked_in=True,
            current_team=1,
            position=POSITION.N,
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea",
            last_name="Losue",
            preferred_position=POSITION.B,
            is_checked_in=True,
            current_team=1,
            position=POSITION.N,
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
            preferred_position=POSITION.NB,
            is_checked_in=True,
            current_team=2,
            position=POSITION.N,
        )

        self.tournament = Tournament.objects.create(
            year=get_current_year(), show_teams=True, show_finals_teams=True
        )

    def test_none_with_cut_status(self):
        self.ballkid1.cut_status = CUT_STATUS.DEFINITELY_KEEP
        self.ballkid2.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid3.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

        response = self.client.patch(
            self.url,
            {"should_cut": True, "cut_status": CUT_STATUS.POSSIBLY_CUT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

    def test_should_not_cut(self):
        self.ballkid1.cut_status = CUT_STATUS.DEFINITELY_KEEP
        self.ballkid2.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid3.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

        response = self.client.patch(
            self.url,
            {"should_cut": False, "cut_status": CUT_STATUS.DEFINITELY_CUT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

    def test_should_cut_one_with_cut_status(self):
        self.ballkid1.cut_status = CUT_STATUS.DEFINITELY_KEEP
        self.ballkid2.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid3.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

        response = self.client.patch(
            self.url,
            {"should_cut": True, "cut_status": CUT_STATUS.DEFINITELY_KEEP},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid1.refresh_from_db()
        self.assertEqual(1, Ballkid.objects.filter(is_cut=True).count())
        self.assertTrue(self.ballkid1.is_cut)

    def test_should_cut_mult_with_cut_status(self):
        self.ballkid1.cut_status = CUT_STATUS.DEFINITELY_KEEP
        self.ballkid2.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid3.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

        response = self.client.patch(
            self.url,
            {"should_cut": True, "cut_status": CUT_STATUS.DEFINITELY_CUT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()
        self.assertEqual(2, Ballkid.objects.filter(is_cut=True).count())
        self.assertTrue(self.ballkid2.is_cut)
        self.assertTrue(self.ballkid3.is_cut)

    def test_cut_checks_out_reset_position_and_team(self):
        self.ballkid1.cut_status = CUT_STATUS.DEFINITELY_KEEP
        self.ballkid2.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid3.cut_status = CUT_STATUS.DEFINITELY_CUT
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.assertEqual(0, Ballkid.objects.filter(is_cut=True).count())

        response = self.client.patch(
            self.url,
            {"should_cut": True, "cut_status": CUT_STATUS.DEFINITELY_CUT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()
        self.assertEqual(2, Ballkid.objects.filter(is_cut=True).count())
        self.assertFalse(self.ballkid1.is_cut)
        self.assertTrue(self.ballkid2.is_cut)
        self.assertTrue(self.ballkid3.is_cut)

        self.assertTrue(self.ballkid1.is_checked_in)
        self.assertFalse(self.ballkid2.is_checked_in)
        self.assertFalse(self.ballkid3.is_checked_in)

        self.assertEqual(1, self.ballkid1.current_team)
        self.assertEqual(0, self.ballkid2.current_team)
        self.assertEqual(0, self.ballkid3.current_team)

        self.assertEqual(POSITION.N, self.ballkid1.position)
        self.assertEqual(POSITION.B, self.ballkid2.position)
        self.assertEqual(POSITION.N, self.ballkid3.position)


class TestCalcNumTeamsView(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.url = reverse("calc-num-teams")

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea",
            last_name="Losue",
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
        )

    def test_none_checked_in(self):
        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([], response.data["teams"])

    def test_all_checked_in(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid2.current_team = 2
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1, 2], response.data["teams"])

    def test_some_checked_in(self):
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid2.current_team = 2
        self.ballkid3.current_team = 1
        self.ballkid2.save()
        self.ballkid3.save()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1, 2], response.data["teams"])

    def test_empty_maximal_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid3.save()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1], response.data["teams"])

    def test_empty_nonmaximal_team(self):
        self.ballkid2.is_checked_in = True
        self.ballkid2.current_team = 2
        self.ballkid2.save()

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1, 2], response.data["teams"])

    def test_checkout_maximal_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid2.current_team = 2
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.ballkid2.set_field("is_checked_in", False)

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1], response.data["teams"])

    def test_checkout_nonmaximal_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid2.current_team = 2
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.ballkid1.set_field("is_checked_in", False)

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1, 2], response.data["teams"])

    def test_cut_nonmaximal_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid2.current_team = 2
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.ballkid3.set_field("is_cut", True)

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1, 2], response.data["teams"])

    def test_archive_maximal_team(self):
        self.ballkid1.is_checked_in = True
        self.ballkid2.is_checked_in = True
        self.ballkid3.is_checked_in = True
        self.ballkid1.current_team = 1
        self.ballkid2.current_team = 2
        self.ballkid3.current_team = 1
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        self.ballkid2.set_field("is_active", False)

        response = self.client.get(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([1], response.data["teams"])


class TestClearTeamView(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.url = reverse("clear-team")

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=True,
            current_team=1,
            preferred_position=POSITION.NB,
            finals_team=MATCH_TYPE.MS,
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea",
            last_name="Losue",
            is_checked_in=True,
            current_team=1,
            preferred_position=POSITION.N,
            finals_team=MATCH_TYPE.MD,
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
            is_checked_in=True,
            current_team=2,
            preferred_position=POSITION.BN,
            finals_team=MATCH_TYPE.MS,
        )

        Tournament.objects.create(year=get_current_year(), show_finals_teams=True)

    def test_nonexisting_team(self):
        response = self.client.patch(self.url, {"current_team": 3}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(3, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            2, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )

    def test_no_arg(self):
        response = self.client.patch(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_arg(self):
        response = self.client.patch(self.url, {"wrong_arg": 0}, format="json")
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
        self.assertEqual(3, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(1, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            2, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )

    def test_one_on_team(self):
        response = self.client.patch(self.url, {"current_team": 2}, format="json")
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(1, self.ballkid1.current_team)
        self.assertEqual(1, self.ballkid2.current_team)
        self.assertEqual(0, self.ballkid3.current_team)
        self.assertEqual(3, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(2, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            1, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )

    def test_reset_position(self):
        self.ballkid1.position = POSITION.N
        self.ballkid2.position = POSITION.N
        self.ballkid3.position = POSITION.N
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        response = self.client.patch(self.url, {"current_team": 2}, format="json")
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(3, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(2, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            1, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(POSITION.B, self.ballkid3.position)
        self.assertEqual(0, self.ballkid3.current_team)

    def test_multiple_on_team_finals(self):
        response = self.client.patch(
            self.url, {"finals_team": MATCH_TYPE.MS}, format="json"
        )
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual("", self.ballkid1.finals_team)
        self.assertEqual(MATCH_TYPE.MD, self.ballkid2.finals_team)
        self.assertEqual("", self.ballkid3.finals_team)
        self.assertEqual(3, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(3, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            2, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )

    def test_nonexisting_team_finals(self):
        response = self.client.patch(
            self.url, {"finals_team": MATCH_TYPE.WD}, format="json"
        )
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(MATCH_TYPE.MS, self.ballkid1.finals_team)
        self.assertEqual(MATCH_TYPE.MD, self.ballkid2.finals_team)
        self.assertEqual(MATCH_TYPE.MS, self.ballkid3.finals_team)
        self.assertEqual(3, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(3, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            2, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )

    def test_reset_position_finals(self):
        self.ballkid1.finals_position = POSITION.N
        self.ballkid2.finals_position = POSITION.N
        self.ballkid3.finals_position = POSITION.N
        self.ballkid1.save()
        self.ballkid2.save()
        self.ballkid3.save()

        response = self.client.patch(
            self.url, {"finals_team": MATCH_TYPE.MS}, format="json"
        )
        self.ballkid1.refresh_from_db()
        self.ballkid2.refresh_from_db()
        self.ballkid3.refresh_from_db()

        self.assertEqual(3, Ballkid.objects.filter(is_checked_in=True).count())
        self.assertEqual(3, Ballkid.objects.filter(current_team__gt=0).count())
        self.assertEqual(
            2, Ballkid.objects.aggregate(num_teams=Max("current_team"))["num_teams"]
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(POSITION.N, self.ballkid1.finals_position)
        self.assertEqual(POSITION.N, self.ballkid2.finals_position)
        self.assertEqual(POSITION.B, self.ballkid3.finals_position)
        self.assertEqual("", self.ballkid1.finals_team)
        self.assertEqual("", self.ballkid3.finals_team)

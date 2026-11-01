from django.urls import reverse
from django.db.models import Max
from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from api.models.ballkid import Ballkid, MATCH_TYPE, POSITION, CUT_STATUS
from api.models.schedule import Tournament
from api.models.rating import Rating
from api.views.rating import run_calibration_and_save_params
from api.serializers import BallkidSerializer, BallkidListSerializer
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

        self.tournament = Tournament.objects.create(year=get_current_year())

    def test_list(self):
        response = self.client.get(reverse("list"))
        ballkids = [
            self.ballkid6,
            self.ballkid5,
            self.ballkid3,
            self.ballkid1,
            self.ballkid2,
        ]
        serializer = BallkidListSerializer(
            ballkids,
            many=True,
            context={"request": response.wsgi_request},
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)
        # List payload should omit profile-only fields
        self.assertNotIn("comments", response.data[0])
        self.assertNotIn("phone", response.data[0])
        self.assertNotIn("emergency_name", response.data[0])

    def test_sorted_list(self):
        response = self.client.get(reverse("sorted-list"))
        ballkids = [self.ballkid2, self.ballkid1, self.ballkid3]
        serializer = BallkidListSerializer(ballkids, many=True)

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
        # Chairperson sorted-list includes rank by default
        self.assertIn("rank", response.data[0])

    def test_sorted_list_skips_rank(self):
        response = self.client.get(reverse("sorted-list"), {"rank": "0"})
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertNotIn("rank", response.data[0])
        self.assertNotIn("calibrated_avg", response.data[0])

    def test_self_cut_list(self):
        response = self.client.get(reverse("self-cut-list"))

        ballkid = response.data[0]
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(self.ballkid5.first_name, ballkid["first_name"])
        self.assertEqual("Self-Cut", ballkid["cut_status"])

    def test_inactive_list(self):
        response = self.client.get(reverse("inactive-list"))
        ballkids = [self.ballkid6, self.ballkid4]
        serializer = BallkidListSerializer(
            ballkids,
            many=True,
            context={"request": response.wsgi_request},
        )

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
        run_calibration_and_save_params(get_current_year())

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
        run_calibration_and_save_params(get_current_year())

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

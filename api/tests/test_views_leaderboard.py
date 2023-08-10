from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from api.models.ballkid import Ballkid
from api.serializers import *
from api.tests.utils import *
from datetime import datetime


class TestGetCheckinLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.ballkid3 = Ballkid.objects.create(first_name="Joe", last_name="Losue")
        self.ballkid4 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False
        )

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, CheckinAnalytics.objects.count())
        for analytic in CheckinAnalytics.objects.all():
            self.assertEqual(0, analytic.count)
            self.assertEqual(timedelta(), analytic.duration)

    def test_one_history_each(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )

        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual("13:00:00", leaderboard1["checkin_duration"])
        self.assertEqual(1, leaderboard1["checkin_days"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual("05:00:00", leaderboard2["checkin_duration"])
        self.assertEqual(1, leaderboard2["checkin_days"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("02:00:00", leaderboard3["checkin_duration"])
        self.assertEqual(1, leaderboard3["checkin_days"])

    def test_filter_inactive(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid4,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )

        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual("13:00:00", leaderboard1["checkin_duration"])
        self.assertEqual(1, leaderboard1["checkin_days"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual("05:00:00", leaderboard2["checkin_duration"])
        self.assertEqual(1, leaderboard2["checkin_days"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("02:00:00", leaderboard3["checkin_duration"])
        self.assertEqual(1, leaderboard3["checkin_days"])

    def test_mult_histories_same_day(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
            is_first_checkin=True,
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 17, 30, 0),
            duration=timedelta(hours=8),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 18, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=4),
            is_first_checkin=False,
        )

        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid1.first_name, leaderboard1["first_name"])
        self.assertEqual("09:00:00", leaderboard1["checkin_duration"])
        self.assertEqual(1, leaderboard1["checkin_days"])
        self.assertEqual("10:30:00", leaderboard1["avg_checkin_time"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid2.first_name, leaderboard2["first_name"])
        self.assertEqual("08:00:00", leaderboard2["checkin_duration"])
        self.assertEqual(1, leaderboard2["checkin_days"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("02:00:00", leaderboard3["checkin_duration"])
        self.assertEqual(1, leaderboard3["checkin_days"])

    def test_mult_histories_diff_days(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 20, 30, 0),
            duration=timedelta(hours=11),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 4, 18, 30, 0),
            end=datetime(2023, 5, 4, 22, 30, 0),
            duration=timedelta(hours=4),
        )

        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual("11:00:00", leaderboard1["checkin_duration"])
        self.assertEqual(1, leaderboard1["checkin_days"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual("09:00:00", leaderboard2["checkin_duration"])
        self.assertEqual(2, leaderboard2["checkin_days"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("02:00:00", leaderboard3["checkin_duration"])
        self.assertEqual(1, leaderboard3["checkin_days"])

    def test_mult_histories_span_midnight(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
            duration=timedelta(hours=9),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 18, 30, 0),
            end=datetime(2023, 5, 4, 2, 30, 0),
            duration=timedelta(hours=8),
        )

        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid1.first_name, leaderboard1["first_name"])
        self.assertEqual("13:00:00", leaderboard1["checkin_duration"])
        self.assertEqual(1, leaderboard1["checkin_days"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid2.first_name, leaderboard2["first_name"])
        self.assertEqual("09:00:00", leaderboard2["checkin_duration"])
        self.assertEqual(1, leaderboard2["checkin_days"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("02:00:00", leaderboard3["checkin_duration"])
        self.assertEqual(1, leaderboard3["checkin_days"])


class TestGetAverageCheckinLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.ballkid3 = Ballkid.objects.create(first_name="Joe", last_name="Losue")
        self.ballkid4 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False
        )

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-average-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=0), response.data["checkin_avg"])
        self.assertEqual(0, response.data["days_avg"])

    def test_one_history_each(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=7),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 13, 30, 0),
            duration=timedelta(hours=3),
        )

        response = self.client.get(
            reverse("get-average-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=5), response.data["checkin_avg"])
        self.assertEqual(1, response.data["days_avg"])

    def test_filter_inactive(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=7),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 13, 30, 0),
            duration=timedelta(hours=3),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid4,
            start=datetime(2023, 5, 3, 3, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
            duration=timedelta(hours=15),
        )

        response = self.client.get(
            reverse("get-average-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=5), response.data["checkin_avg"])
        self.assertEqual(1, response.data["days_avg"])

    def test_mult_histories_same_day(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=7),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 11, 30, 0),
            end=datetime(2023, 5, 3, 13, 30, 0),
            duration=timedelta(hours=2),
            is_first_checkin=True,
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 16, 30, 0),
            end=datetime(2023, 5, 3, 20, 30, 0),
            duration=timedelta(hours=4),
            is_first_checkin=False,
        )

        response = self.client.get(
            reverse("get-average-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=6), response.data["checkin_avg"])
        self.assertEqual(1, response.data["days_avg"])
        self.assertEqual("10:30:00", str(response.data["avg_checkin_time"]))

    def test_mult_histories_diff_days(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=7),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 11, 30, 0),
            end=datetime(2023, 5, 3, 13, 30, 0),
            duration=timedelta(hours=2),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 4, 16, 30, 0),
            end=datetime(2023, 5, 4, 20, 30, 0),
            duration=timedelta(hours=4),
        )

        response = self.client.get(
            reverse("get-average-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=6), response.data["checkin_avg"])
        self.assertLess(1, response.data["days_avg"])

    def test_mult_histories_span_midnight(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=6),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=7),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 11, 30, 0),
            end=datetime(2023, 5, 3, 13, 30, 0),
            duration=timedelta(hours=2),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 20, 30, 0),
            end=datetime(2023, 5, 4, 2, 30, 0),
            duration=timedelta(hours=6),
        )

        response = self.client.get(
            reverse("get-average-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=7), response.data["checkin_avg"])
        self.assertEqual(1, response.data["days_avg"])


class TestGetRatingsCaptainLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.captain1 = Ballkid.objects.create(
            first_name="Joe", last_name="Losue", is_captain=True
        )
        self.captain2 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False, is_captain=True
        )
        self.chairperson = Ballkid.objects.create(
            first_name="Chair", last_name="Iosue", is_chairperson=True
        )

    def test_no_ratings(self):
        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

    def test_one_rating(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=5)

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.captain1.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.chairperson.first_name, leaderboard2["first_name"])
        self.assertEqual(0, leaderboard2["num_ratings"])
        self.assertEqual(0, leaderboard2["raw_avg"])
        self.assertEqual(0, leaderboard2["raw_stdev"])

    def test_exclude_archived(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=5)
        Rating.objects.create(rater=self.captain2, ratee=self.ballkid1, rating=5)

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.captain1.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.chairperson.first_name, leaderboard2["first_name"])
        self.assertEqual(0, leaderboard2["num_ratings"])

    def test_mult_ratings(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=2)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid1, rating=3)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid2, rating=5)

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.chairperson.first_name, leaderboard1["first_name"])
        self.assertEqual(2, leaderboard1["num_ratings"])
        self.assertEqual(4, leaderboard1["raw_avg"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.captain1.first_name, leaderboard2["first_name"])
        self.assertEqual(1, leaderboard2["num_ratings"])
        self.assertEqual(2, leaderboard2["raw_avg"])

    def test_mult_ratings_nonzero_other_categories(self):
        Rating.objects.create(
            rater=self.captain1, ratee=self.ballkid1, rating=2, effort_rating=1
        )
        Rating.objects.create(
            rater=self.chairperson, ratee=self.ballkid1, rating=3, athleticism_rating=1
        )
        Rating.objects.create(
            rater=self.chairperson, ratee=self.ballkid2, rating=5, decision_rating=1
        )

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.chairperson.first_name, leaderboard1["first_name"])
        self.assertEqual(2, leaderboard1["num_ratings"])
        self.assertEqual(4, leaderboard1["raw_avg"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.captain1.first_name, leaderboard2["first_name"])
        self.assertEqual(1, leaderboard2["num_ratings"])
        self.assertEqual(2, leaderboard2["raw_avg"])

    def test_mult_ratings_diff_dates(self):
        Rating.objects.create(
            rater=self.captain1, ratee=self.ballkid1, rating=2, date=datetime.today()
        )
        Rating.objects.create(
            rater=self.chairperson,
            ratee=self.ballkid1,
            rating=3,
            date=datetime.today() + timedelta(days=1),
        )
        Rating.objects.create(
            rater=self.chairperson,
            ratee=self.ballkid2,
            rating=5,
            date=datetime.today() - timedelta(days=3),
        )

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.chairperson.first_name, leaderboard1["first_name"])
        self.assertEqual(2, leaderboard1["num_ratings"])
        self.assertEqual(4, leaderboard1["raw_avg"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.captain1.first_name, leaderboard2["first_name"])
        self.assertEqual(1, leaderboard2["num_ratings"])
        self.assertEqual(2, leaderboard2["raw_avg"])

    def test_mult_ratings_same_dates(self):
        Rating.objects.create(
            rater=self.captain1, ratee=self.ballkid1, rating=2, date=datetime.today()
        )
        Rating.objects.create(
            rater=self.chairperson, ratee=self.ballkid1, rating=3, date=datetime.today()
        )
        Rating.objects.create(
            rater=self.chairperson, ratee=self.ballkid2, rating=5, date=datetime.today()
        )

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.chairperson.first_name, leaderboard1["first_name"])
        self.assertEqual(2, leaderboard1["num_ratings"])
        self.assertEqual(4, leaderboard1["raw_avg"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.captain1.first_name, leaderboard2["first_name"])
        self.assertEqual(1, leaderboard2["num_ratings"])
        self.assertEqual(2, leaderboard2["raw_avg"])

    def test_only_include_ratings_from_this_year(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=2)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid1, rating=3)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid2, rating=5)
        Rating.objects.create(
            rater=self.captain1,
            ratee=self.ballkid2,
            rating=1,
            date=datetime.today() - timedelta(days=365),
        )

        response = self.client.get(
            reverse("get-captain-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(2, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.chairperson.first_name, leaderboard1["first_name"])
        self.assertEqual(2, leaderboard1["num_ratings"])
        self.assertEqual(4, leaderboard1["raw_avg"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.captain1.first_name, leaderboard2["first_name"])
        self.assertEqual(1, leaderboard2["num_ratings"])
        self.assertEqual(2, leaderboard2["raw_avg"])


class TestGetRatingsBallkidLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.captain1 = Ballkid.objects.create(
            first_name="Joe", last_name="Losue", is_captain=True
        )
        self.captain2 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False, is_captain=True
        )
        self.chairperson = Ballkid.objects.create(
            first_name="Chair", last_name="Iosue", is_chairperson=True
        )

    def test_no_ratings(self):
        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

    def test_one_rating(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=5)

        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid1.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

    def test_mult_ratings_ballkids(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=5)
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid2, rating=5)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid1, rating=3)

        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual(2, leaderboard2["num_ratings"])
        self.assertEqual(4, leaderboard2["raw_avg"])
        self.assertEqual(1, leaderboard2["raw_stdev"])

    def test_mult_ratings_captains(self):
        Rating.objects.create(rater=self.captain1, ratee=self.chairperson, rating=5)
        Rating.objects.create(rater=self.captain1, ratee=self.chairperson, rating=5)
        Rating.objects.create(rater=self.chairperson, ratee=self.captain1, rating=3)

        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.chairperson.first_name, leaderboard1["first_name"])
        self.assertEqual(2, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.captain1.first_name, leaderboard2["first_name"])
        self.assertEqual(1, leaderboard2["num_ratings"])
        self.assertEqual(3, leaderboard2["raw_avg"])
        self.assertEqual(0, leaderboard2["raw_stdev"])

    def test_mult_ratings_exclude_archived(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=5)
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid2, rating=5)
        Rating.objects.create(rater=self.captain1, ratee=self.captain2, rating=5)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid1, rating=3)

        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual(2, leaderboard2["num_ratings"])
        self.assertEqual(4, leaderboard2["raw_avg"])
        self.assertEqual(1, leaderboard2["raw_stdev"])

    def test_only_include_ratings_from_this_year(self):
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid1, rating=5)
        Rating.objects.create(rater=self.captain1, ratee=self.ballkid2, rating=5)
        Rating.objects.create(rater=self.chairperson, ratee=self.ballkid1, rating=3)
        Rating.objects.create(
            rater=self.chairperson,
            ratee=self.ballkid2,
            rating=1,
            date=datetime.today() - timedelta(days=365),
        )

        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual(2, leaderboard2["num_ratings"])
        self.assertEqual(4, leaderboard2["raw_avg"])
        self.assertEqual(1, leaderboard2["raw_stdev"])

    def test_mult_ratings_nonzero_other_categories(self):
        Rating.objects.create(
            rater=self.captain1, ratee=self.ballkid1, rating=5, effort_rating=3
        )
        Rating.objects.create(
            rater=self.captain1, ratee=self.ballkid2, rating=5, rolling_rating=1
        )
        Rating.objects.create(
            rater=self.chairperson, ratee=self.ballkid1, rating=3, awareness_rating=1
        )

        response = self.client.get(
            reverse("get-ballkid-leaderboard"),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(4, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual(1, leaderboard1["num_ratings"])
        self.assertEqual(5, leaderboard1["raw_avg"])
        self.assertEqual(0, leaderboard1["raw_stdev"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual(2, leaderboard2["num_ratings"])
        self.assertEqual(4, leaderboard2["raw_avg"])
        self.assertEqual(1, leaderboard2["raw_stdev"])


class TestGetCourtLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.ballkid3 = Ballkid.objects.create(first_name="Joe", last_name="Losue")
        self.ballkid4 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False
        )

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            0, CourtAnalytics.objects.filter(duration__gt=timedelta()).count()
        )

    def test_one_history_each_one_court(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=6),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
            duration=timedelta(hours=4),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual("13:00:00", leaderboard1["checkin_duration"])
        self.assertEqual("08:00:00", leaderboard1["court_duration"])
        self.assertEqual("08:00:00", leaderboard1["stadium_duration"])
        self.assertEqual("00:00:00", leaderboard1["harris_duration"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual("06:00:00", leaderboard2["checkin_duration"])
        self.assertEqual("05:00:00", leaderboard2["court_duration"])
        self.assertEqual("05:00:00", leaderboard2["stadium_duration"])
        self.assertEqual("00:00:00", leaderboard1["harris_duration"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("04:00:00", leaderboard3["checkin_duration"])
        self.assertEqual("00:00:00", leaderboard3["court_duration"])

    def test_filter_inactive(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=6),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
            duration=timedelta(hours=4),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid4,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid4,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual("13:00:00", leaderboard1["checkin_duration"])
        self.assertEqual("08:00:00", leaderboard1["court_duration"])
        self.assertEqual("08:00:00", leaderboard1["stadium_duration"])
        self.assertEqual("00:00:00", leaderboard1["harris_duration"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual("06:00:00", leaderboard2["checkin_duration"])
        self.assertEqual("05:00:00", leaderboard2["court_duration"])
        self.assertEqual("05:00:00", leaderboard2["stadium_duration"])
        self.assertEqual("00:00:00", leaderboard1["harris_duration"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("04:00:00", leaderboard3["checkin_duration"])
        self.assertEqual("00:00:00", leaderboard3["court_duration"])

    def test_mult_histories_mult_courts(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.HARRIS,
            start=datetime(2023, 5, 3, 14, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid2.first_name, leaderboard1["first_name"])
        self.assertEqual("08:00:00", leaderboard1["court_duration"])
        self.assertEqual("04:00:00", leaderboard1["stadium_duration"])
        self.assertEqual("04:00:00", leaderboard1["harris_duration"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid1.first_name, leaderboard2["first_name"])
        self.assertEqual("05:00:00", leaderboard2["court_duration"])
        self.assertEqual("04:00:00", leaderboard2["stadium_duration"])
        self.assertEqual("01:00:00", leaderboard2["harris_duration"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("00:00:00", leaderboard3["court_duration"])

    def test_mult_histories_mult_courts_mult_teams(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 12, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
        )
        Schedule.objects.create(
            team=2,
            court=COURT.HARRIS,
            start=datetime(2023, 5, 3, 11, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, len(response.data))

        leaderboard1 = response.data[0]
        self.assertEqual(self.ballkid1.first_name, leaderboard1["first_name"])
        self.assertEqual("04:00:00", leaderboard1["court_duration"])
        self.assertEqual("04:00:00", leaderboard1["stadium_duration"])
        self.assertEqual("00:00:00", leaderboard1["harris_duration"])

        leaderboard2 = response.data[1]
        self.assertEqual(self.ballkid2.first_name, leaderboard2["first_name"])
        self.assertEqual("02:00:00", leaderboard2["court_duration"])
        self.assertEqual("02:00:00", leaderboard2["stadium_duration"])
        self.assertEqual("00:00:00", leaderboard2["harris_duration"])

        leaderboard3 = response.data[2]
        self.assertEqual(self.ballkid3.first_name, leaderboard3["first_name"])
        self.assertEqual("01:00:00", leaderboard3["court_duration"])
        self.assertEqual("00:00:00", leaderboard3["stadium_duration"])
        self.assertEqual("01:00:00", leaderboard3["harris_duration"])


class TestGetAverageCourtLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.ballkid3 = Ballkid.objects.create(first_name="Joe", last_name="Losue")
        self.ballkid4 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False
        )

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-average-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=0), response.data["checkin_avg"])
        self.assertEqual(timedelta(hours=0), response.data["court_avg"])
        self.assertEqual(timedelta(hours=0), response.data["stadium_avg"])

    def test_one_history_each_one_court(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=6),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 17, 30, 0),
            duration=timedelta(hours=8),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
            duration=timedelta(hours=4),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
            duration=timedelta(hours=4),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 20, 30, 0),
            duration=timedelta(hours=11),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-average-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=6), response.data["checkin_avg"])
        self.assertEqual(timedelta(hours=4), response.data["court_avg"])
        self.assertEqual(timedelta(hours=4), response.data["stadium_avg"])
        self.assertEqual(timedelta(hours=0), response.data["harris_avg"])

    def test_filter_inactive(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 16, 30, 0),
            duration=timedelta(hours=6),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 17, 30, 0),
            duration=timedelta(hours=8),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid3,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
            duration=timedelta(hours=4),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid4,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 17, 30, 0),
            duration=timedelta(hours=8),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
            duration=timedelta(hours=4),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 20, 30, 0),
            duration=timedelta(hours=11),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid4,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 20, 30, 0),
            duration=timedelta(hours=11),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-average-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=6), response.data["checkin_avg"])
        self.assertEqual(timedelta(hours=4), response.data["court_avg"])
        self.assertEqual(timedelta(hours=4), response.data["stadium_avg"])
        self.assertEqual(timedelta(hours=0), response.data["harris_avg"])

    def test_mult_histories_mult_courts(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 9, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.HARRIS,
            start=datetime(2023, 5, 3, 14, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-average-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertLess(timedelta(), response.data["court_avg"])
        self.assertLess(timedelta(), response.data["stadium_avg"])
        self.assertLess(timedelta(), response.data["harris_avg"])
        self.assertEqual(timedelta(), response.data["grandstand_avg"])
        self.assertEqual(timedelta(), response.data["four_avg"])
        self.assertEqual(timedelta(), response.data["five_avg"])

    def test_mult_histories_mult_courts_mult_teams(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            team=1,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 15, 30, 0),
            duration=timedelta(hours=5),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            team=1,
            start=datetime(2023, 5, 3, 12, 30, 0),
            end=datetime(2023, 5, 3, 22, 30, 0),
            duration=timedelta(hours=13),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid3,
            team=2,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 12, 30, 0),
            duration=timedelta(hours=2),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2023, 5, 3, 10, 30, 0),
            end=datetime(2023, 5, 3, 14, 30, 0),
        )
        Schedule.objects.create(
            team=2,
            court=COURT.HARRIS,
            start=datetime(2023, 5, 3, 11, 30, 0),
            end=datetime(2023, 5, 3, 18, 30, 0),
        )

        response = self.client.get(
            reverse("get-average-court-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertLess(timedelta(), response.data["court_avg"])
        self.assertLess(timedelta(), response.data["stadium_avg"])
        self.assertLess(timedelta(), response.data["harris_avg"])
        self.assertEqual(timedelta(), response.data["grandstand_avg"])
        self.assertEqual(timedelta(), response.data["four_avg"])
        self.assertEqual(timedelta(), response.data["five_avg"])

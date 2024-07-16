from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models.ballkid import Ballkid, MATCH_TYPE
from api.views.ballkid import recalc_captain_analytics
from api.serializers import *
from api.tests.utils import *
from api.consts import *

from datetime import datetime


class TestGetFinalsHistory(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(
            first_name="Lacy", last_name="Iosue", num_years_experience=3
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Andrea", last_name="Losue", is_captain=True
        )

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-finals-history", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = FinalsHistorySerializer([], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories(self):
        history1 = FinalsHistory.objects.create(
            ballkid=self.ballkid1, match_type=MATCH_TYPE.MD, count=1, years=[2022]
        )
        history2 = FinalsHistory.objects.create(
            ballkid=self.ballkid1, match_type=MATCH_TYPE.MS, count=2, years=[2020, 2021]
        )
        history3 = FinalsHistory.objects.create(
            ballkid=self.ballkid2, match_type=MATCH_TYPE.MD, count=1, years=[2022]
        )
        history4 = FinalsHistory.objects.create(
            ballkid=self.ballkid2, match_type=MATCH_TYPE.WS, count=1, years=[2022]
        )

        response = self.client.get(
            reverse("get-finals-history", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = FinalsHistorySerializer([history1, history2], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)


class TestGetCutHistory(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-cut-history", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = CutHistorySerializer([], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories(self):
        history1 = CutHistory.objects.create(
            ballkid=self.ballkid1, year=2023, furthest_day=DAY_OF_WEEK.FRIDAY
        )
        history2 = CutHistory.objects.create(
            ballkid=self.ballkid1, year=2022, furthest_day=DAY_OF_WEEK.TUESDAY
        )
        history3 = CutHistory.objects.create(
            ballkid=self.ballkid2,
            year=2023,
            furthest_day=datetime.now().strftime(WEEKDAY_FORMAT_STR),
            furthest_date=datetime.now().strftime(HYPHEN_YEAR_MONTH_DAY_FORMAT_STR),
            self_cut=True,
        )
        history4 = CutHistory.objects.create(
            ballkid=self.ballkid2, year=2020, furthest_day=DAY_OF_WEEK.THURSDAY
        )

        response = self.client.get(
            reverse("get-cut-history", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = CutHistorySerializer([history1, history2], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories_in_order(self):
        history1 = CutHistory.objects.create(
            ballkid=self.ballkid1, year=2023, furthest_day=DAY_OF_WEEK.SATURDAY
        )
        history2 = CutHistory.objects.create(
            ballkid=self.ballkid1,
            year=2022,
            furthest_day=DAY_OF_WEEK.TUESDAY,
            self_cut=True,
        )
        history3 = CutHistory.objects.create(
            ballkid=self.ballkid2,
            year=2018,
            furthest_day=datetime.now().strftime(WEEKDAY_FORMAT_STR),
            furthest_date=datetime.now().strftime(HYPHEN_YEAR_MONTH_DAY_FORMAT_STR),
        )
        history4 = CutHistory.objects.create(
            ballkid=self.ballkid2,
            year=2020,
            furthest_day=DAY_OF_WEEK.THURSDAY,
            self_cut=True,
        )

        response = self.client.get(
            reverse("get-cut-history", kwargs={"pk": self.ballkid2.id}),
            format="json",
        )
        serializer = CutHistorySerializer([history4, history3], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)


class TestGetPastTeams(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()
        self.captain_client = setup_testing_client(name="captain")

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.captain1 = Ballkid.objects.create(
            first_name="Joe", last_name="Losue", is_captain=True
        )
        self.captain2 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_captain=True
        )

    def test_no_histories_ballkid(self):
        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual({}, response.data)

    def test_no_histories_captain(self):
        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual({}, response.data)

    def test_mult_histories_ballkid(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 15, 30, 0),
            team=3,
        )

        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual({}, response.data)

    def test_one_history_captain(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 15, 30, 0),
            duration=timedelta(hours=5),
            team=3,
        )

        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain2.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            {
                datetime.strftime(datetime(2023, 4, 9), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid2.id,
                ],
            },
            response.data,
        )

    def test_one_history_captain_exclude_short(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 10, 45, 0),
            duration=timedelta(minutes=15),
            team=3,
        )

        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain2.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual({}, response.data)

    def test_mult_histories_captain(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            duration=timedelta(hours=5),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            duration=timedelta(hours=5),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            duration=timedelta(hours=5),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 15, 30, 0),
            team=3,
        )

        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            {
                datetime.strftime(datetime(2023, 4, 6), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid1.id,
                    self.ballkid2.id,
                ],
                datetime.strftime(datetime(2023, 4, 7), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid1.id
                ],
            },
            response.data,
        )

    def test_mult_histories_captain_same_day(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            duration=timedelta(hours=5),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 17, 30, 0),
            end=datetime(2023, 4, 6, 19, 30, 0),
            duration=timedelta(hours=2),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            duration=timedelta(hours=5),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 15, 30, 0),
            team=3,
        )

        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            {
                datetime.strftime(datetime(2023, 4, 6), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid1.id,
                ],
                datetime.strftime(datetime(2023, 4, 7), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid1.id
                ],
            },
            response.data,
        )

    def test_mult_histories_captain_past_midnight(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 7, 1, 30, 0),
            duration=timedelta(hours=15),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            duration=timedelta(hours=5),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            duration=timedelta(hours=5),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 15, 30, 0),
            team=3,
        )

        response = self.client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            {
                datetime.strftime(datetime(2023, 4, 6), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid1.id,
                    self.ballkid2.id,
                ],
            },
            response.data,
        )

    def test_captain_with_permissions(self):
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 6, 10, 30, 0),
            end=datetime(2023, 4, 6, 15, 30, 0),
            team=4,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 7, 10, 30, 0),
            end=datetime(2023, 4, 7, 15, 30, 0),
            team=2,
        )
        CaptainHistory.objects.create(
            captain=self.captain2,
            ballkid=self.ballkid2,
            start=datetime(2023, 4, 9, 10, 30, 0),
            end=datetime(2023, 4, 9, 15, 30, 0),
            duration=timedelta(hours=5),
            team=3,
        )

        response = self.captain_client.get(
            reverse("get-past-teams", kwargs={"pk": self.captain2.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(
            {
                datetime.strftime(datetime(2023, 4, 9), WEEKDAY_MONTH_DAY_FORMAT_STR): [
                    self.ballkid2.id,
                ],
            },
            response.data,
        )


class TestGetCheckinHistory(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")

        self.year = get_current_year()

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-checkins", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = CheckinHistorySerializer([], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories_missing_checkout(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(self.year, 5, 3, 10, 25, 0),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(self.year, 5, 4, 13, 25, 0),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(self.year, 5, 3, 10, 25, 0),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(self.year, 5, 1, 18, 25, 0),
        )

        response = self.client.get(
            reverse("get-checkins", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = CheckinHistorySerializer([history1, history2], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(self.year, 5, 4, 13, 25, 0),
            end=datetime(self.year, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(self.year, 5, 1, 18, 25, 0),
            end=datetime(self.year, 5, 1, 19, 25, 0),
            duration=timedelta(hours=1),
        )

        response = self.client.get(
            reverse("get-checkins", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = CheckinHistorySerializer([history1, history2], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories_in_order(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(self.year, 5, 4, 13, 25, 0),
            end=datetime(self.year, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(self.year, 5, 1, 18, 25, 0),
            end=datetime(self.year, 5, 1, 19, 25, 0),
            duration=timedelta(hours=1),
        )

        response = self.client.get(
            reverse("get-checkins", kwargs={"pk": self.ballkid2.id}),
            format="json",
        )
        serializer = CheckinHistorySerializer([history4, history3], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)


class TestGetCaptainAnalytics(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.captain1 = Ballkid.objects.create(
            first_name="Joe", last_name="Losue", is_captain=True
        )
        self.captain2 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_captain=True
        )

        self.year = get_current_year()

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual([], response.data)

    def test_mult_ballkids_mult_histories(self):
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain1,
            captain=self.captain2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )

        recalc_captain_analytics(self.ballkid1, year=2023)
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1, year=2023
        )
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=15), analytic.duration)

    def test_mult_ballkids_mult_histories_mult_years(self):
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2024, 5, 4, 13, 25, 0),
            end=datetime(2024, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain1,
            captain=self.captain2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2024, 5, 4, 13, 25, 0),
            end=datetime(2024, 5, 4, 18, 25, 0),
            court=COURT.FOUR,
        )

        recalc_captain_analytics(self.ballkid1, year=2023)
        recalc_captain_analytics(self.ballkid1, year=2024)
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1, year=2023
        )
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=9), analytic.duration)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1, year=2024
        )
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=5), analytic.duration)

    def test_mult_ballkids_mult_histories_past_midnight_more_than_24_hrs(self):
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 2, 25, 0),
            duration=timedelta(hours=16),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 4, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain1,
            captain=self.captain2,
            start=datetime(2023, 5, 1, 18, 25, 0),
            end=datetime(2023, 5, 1, 19, 25, 0),
            duration=timedelta(hours=1),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )

        recalc_captain_analytics(self.ballkid1, year=2023)
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1, year=2023
        )
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=25), analytic.duration)

    def test_mult_ballkids_mult_histories_captain_reciprocal(self):
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain1,
            captain=self.captain2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )

        recalc_captain_analytics(self.captain1, year=2023)
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.captain1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.captain1, captain=self.captain2, year=2023
        )
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=9), analytic.duration)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.captain2, captain=self.captain1, year=2023
        )
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=9), analytic.duration)

    def test_mult_ballkids_mult_analytics(self):
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )

        recalc_captain_analytics(self.ballkid1, year=2023)
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic1 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1, year=2023
        )
        self.assertEqual(2, analytic1.count)
        self.assertEqual(timedelta(hours=15), analytic1.duration)

        analytic2 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain2, year=2023
        )
        self.assertEqual(1, analytic2.count)
        self.assertEqual(timedelta(hours=9), analytic2.duration)

    def test_mult_ballkids_mult_analytics_ordered(self):
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain1,
            start=datetime(self.year, 5, 4, 13, 25, 0),
            end=datetime(self.year, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid1,
            captain=self.captain2,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 4, 9, 25, 0),
            duration=timedelta(hours=23),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(self.year, 5, 3, 10, 25, 0),
            end=datetime(self.year, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )

        recalc_captain_analytics(self.ballkid1, year=self.year)
        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic1 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain2, year=self.year
        )
        analytic2 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1, year=self.year
        )
        serializer = CaptainAnalyticsSerializer([analytic1, analytic2], many=True)
        self.assertEqual(serializer.data, response.data)


class TestGetAverageCheckinTime(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")

        self.year = get_current_year()

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-average-checkin-time", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertIsNone(response.data["ballkid"])
        self.assertIsNone(response.data["average"])

    def test_one_history(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year, 5, 3, 10, 25, 0)
        )

        response = self.client.get(
            reverse("get-average-checkin-time", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=10, minutes=25), response.data["ballkid"])
        self.assertEqual(timedelta(hours=10, minutes=25), response.data["average"])

    def test_one_history_each(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year, 5, 3, 10, 25, 0)
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2, start=datetime(self.year, 5, 3, 14, 25, 0)
        )

        response = self.client.get(
            reverse("get-average-checkin-time", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=10, minutes=25), response.data["ballkid"])
        self.assertEqual(timedelta(hours=12, minutes=25), response.data["average"])

    def test_mult_histories_each(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year, 5, 3, 10, 25, 0)
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2, start=datetime(self.year, 5, 3, 15, 25, 0)
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year, 5, 3, 12, 25, 0)
        )

        response = self.client.get(
            reverse("get-average-checkin-time", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=11, minutes=25), response.data["ballkid"])
        self.assertEqual(timedelta(hours=13, minutes=25), response.data["average"])

    def test_mult_histories_mult_years(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year, 5, 3, 10, 25, 0)
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2, start=datetime(self.year, 5, 3, 15, 25, 0)
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year, 5, 3, 12, 25, 0)
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid1, start=datetime(self.year - 1, 5, 3, 12, 25, 0)
        )

        response = self.client.get(
            reverse("get-average-checkin-time", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(timedelta(hours=11, minutes=25), response.data["ballkid"])
        self.assertEqual(timedelta(hours=13, minutes=25), response.data["average"])

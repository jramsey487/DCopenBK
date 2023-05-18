from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from api.models.ballkid import Ballkid, MATCH_TYPE
from api.serializers import *
from api.tests.utils import *
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
            ballkid=self.ballkid1, year=2023, match_type=MATCH_TYPE.WD
        )
        history2 = FinalsHistory.objects.create(
            ballkid=self.ballkid1, year=2022, match_type=MATCH_TYPE.MS
        )
        history3 = FinalsHistory.objects.create(
            ballkid=self.ballkid2, year=2023, match_type=MATCH_TYPE.MD
        )
        history4 = FinalsHistory.objects.create(
            ballkid=self.ballkid2, year=2020, match_type=MATCH_TYPE.WS
        )

        response = self.client.get(
            reverse("get-finals-history", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        serializer = FinalsHistorySerializer([history1, history2], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories_in_order(self):
        history1 = FinalsHistory.objects.create(
            ballkid=self.ballkid1, year=2023, match_type=MATCH_TYPE.WD
        )
        history2 = FinalsHistory.objects.create(
            ballkid=self.ballkid1, year=2022, match_type=MATCH_TYPE.MS
        )
        history3 = FinalsHistory.objects.create(
            ballkid=self.ballkid2, year=2018, match_type=MATCH_TYPE.MD
        )
        history4 = FinalsHistory.objects.create(
            ballkid=self.ballkid2, year=2020, match_type=MATCH_TYPE.WS
        )

        response = self.client.get(
            reverse("get-finals-history", kwargs={"pk": self.ballkid2.id}),
            format="json",
        )
        serializer = FinalsHistorySerializer([history4, history3], many=True)

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

    def test_mult_histories_captain(self):
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
            team=1,
        )
        CaptainHistory.objects.create(
            captain=self.captain1,
            ballkid=self.ballkid1,
            start=datetime(2023, 4, 6, 17, 30, 0),
            end=datetime(2023, 4, 6, 19, 30, 0),
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
            captain=self.captain2,
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
            checkin=datetime(2023, 5, 3, 10, 25, 0),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 4, 13, 25, 0),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 1, 18, 25, 0),
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
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 4, 13, 25, 0),
            checkout=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 1, 18, 25, 0),
            checkout=datetime(2023, 5, 1, 19, 25, 0),
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
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 4, 13, 25, 0),
            checkout=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 1, 18, 25, 0),
            checkout=datetime(2023, 5, 1, 19, 25, 0),
            duration=timedelta(hours=1),
        )

        response = self.client.get(
            reverse("get-checkins", kwargs={"pk": self.ballkid2.id}),
            format="json",
        )
        serializer = CheckinHistorySerializer([history4, history3], many=True)

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(serializer.data, response.data)


class TestGetCheckinDuration(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-checkin-duration", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual("00:00:00", response.data["duration"])
        self.assertEqual(0, response.data["count"])

    def test_mult_ballkids_mult_histories(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 4, 13, 25, 0),
            checkout=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 1, 18, 25, 0),
            checkout=datetime(2023, 5, 1, 19, 25, 0),
            duration=timedelta(hours=1),
        )

        response = self.client.get(
            reverse("get-checkin-duration", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual("15:00:00", response.data["duration"])
        self.assertEqual(2, response.data["count"])

    def test_mult_ballkids_mult_histories_past_midnight_more_than_24_hrs(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 4, 2, 25, 0),
            duration=timedelta(hours=16),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid1,
            checkin=datetime(2023, 5, 4, 10, 25, 0),
            checkout=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history3 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 3, 10, 25, 0),
            checkout=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
        )
        history4 = CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2023, 5, 1, 18, 25, 0),
            checkout=datetime(2023, 5, 1, 19, 25, 0),
            duration=timedelta(hours=1),
        )

        response = self.client.get(
            reverse("get-checkin-duration", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual("1 01:00:00", response.data["duration"])
        self.assertEqual(2, response.data["count"])


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

        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1
        )
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=15), analytic.duration)

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

        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1
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

        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.captain1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.captain1, captain=self.captain2
        )
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=9), analytic.duration)

        analytic = CaptainAnalytics.objects.get(
            ballkid=self.captain2, captain=self.captain1
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

        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic1 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1
        )
        self.assertEqual(2, analytic1.count)
        self.assertEqual(timedelta(hours=15), analytic1.duration)

        analytic2 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain2
        )
        self.assertEqual(1, analytic2.count)
        self.assertEqual(timedelta(hours=9), analytic2.duration)

    def test_mult_ballkids_mult_analytics_ordered(self):
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
            end=datetime(2023, 5, 4, 9, 25, 0),
            duration=timedelta(hours=23),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            court=COURT.STADIUM,
        )

        response = self.client.get(
            reverse("get-captains", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic1 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain2
        )
        analytic2 = CaptainAnalytics.objects.get(
            ballkid=self.ballkid1, captain=self.captain1
        )
        serializer = CaptainAnalyticsSerializer([analytic1, analytic2], many=True)
        self.assertEqual(serializer.data, response.data)


class TestGetCourtAnalytics(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")

    def test_no_histories(self):
        response = self.client.get(
            reverse("get-courts", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual([], response.data)

    def test_mult_ballkids_mult_histories_one_court(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
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

        response = self.client.get(
            reverse("get-courts", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CourtAnalytics.objects.get(ballkid=self.ballkid1, court=COURT.STADIUM)
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=15), analytic.duration)

    def test_mult_ballkids_mult_histories_mult_courts(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 20, 25, 0),
            court=COURT.STADIUM,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 4, 10, 25, 0),
            end=datetime(2023, 5, 4, 18, 25, 0),
            court=COURT.HARRIS,
        )

        response = self.client.get(
            reverse("get-courts", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CourtAnalytics.objects.get(ballkid=self.ballkid1, court=COURT.STADIUM)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=9), analytic.duration)

        analytic = CourtAnalytics.objects.get(ballkid=self.ballkid1, court=COURT.HARRIS)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=5), analytic.duration)

    def test_mult_ballkids_mult_histories_mult_courts_nonordered(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 14, 25, 0),
            court=COURT.STADIUM,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 4, 10, 25, 0),
            end=datetime(2023, 5, 4, 18, 25, 0),
            court=COURT.HARRIS,
        )

        response = self.client.get(
            reverse("get-courts", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic1 = CourtAnalytics.objects.get(ballkid=self.ballkid1, court=COURT.STADIUM)
        analytic2 = CourtAnalytics.objects.get(ballkid=self.ballkid1, court=COURT.HARRIS)

        serializer = CourtAnalyticsSerializer([analytic1, analytic2], many=True)
        self.assertEqual(serializer.data, response.data)

    def test_mult_ballkids_mult_histories_mult_courts_mult_teams(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=1,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid1,
            start=datetime(2023, 5, 4, 13, 25, 0),
            end=datetime(2023, 5, 4, 19, 25, 0),
            duration=timedelta(hours=6),
            team=2,
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid2,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 19, 25, 0),
            duration=timedelta(hours=9),
            team=2,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 3, 10, 25, 0),
            end=datetime(2023, 5, 3, 15, 25, 0),
            court=COURT.STADIUM,
        )
        Schedule.objects.create(
            team=1,
            start=datetime(2023, 5, 4, 10, 25, 0),
            end=datetime(2023, 5, 4, 18, 25, 0),
            court=COURT.HARRIS,
        )

        response = self.client.get(
            reverse("get-courts", kwargs={"pk": self.ballkid1.id}),
            format="json",
        )
        self.assertEqual(status.HTTP_200_OK, response.status_code)

        analytic = CourtAnalytics.objects.get(ballkid=self.ballkid1, court=COURT.STADIUM)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=5), analytic.duration)


class TestGetCheckinLeaderboard(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()

        self.ballkid1 = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Andrea", last_name="Losue")
        self.ballkid3 = Ballkid.objects.create(first_name="Joe", last_name="Losue")
        self.ballkid4 = Ballkid.objects.create(
            first_name="Joseph", last_name="Iosue", is_active=False
        )

    def test_nohistories(self):
        response = self.client.get(
            reverse("get-checkin-leaderboard"),
            format="json",
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(3, CheckinAnalytics.objects.count())
        for analytic in CheckinAnalytics.objects.all():
            self.assertEqual(0, analytic.count)
            self.assertEqual(timedelta(), analytic.duration)

from django.test import TestCase
from datetime import datetime, timedelta, date
from api.utils import *
from api.models.rating import Rating
from api.models.ballkid import Ballkid
from rcal import CalibrationParameters


class TestUtils(TestCase):
    def setUp(self):
        self.ratee1 = Ballkid(first_name="Lacy", last_name="Iosue")
        self.ratee2 = Ballkid(first_name="Andrea", last_name="Iosue")
        self.rater1 = Ballkid(first_name="Captain", last_name="Iosue")
        self.rater2 = Ballkid(first_name="Joe", last_name="Iosue")
        self.ratee1.save()
        self.ratee2.save()
        self.rater1.save()
        self.rater2.save()

    def test_overlapping_time_disjoint(self):
        start1 = datetime(2022, 1, 1, 10, 30)
        end1 = datetime(2022, 1, 1, 12, 30)
        start2 = datetime(2022, 1, 1, 13, 30)
        end2 = datetime(2022, 1, 1, 14, 30)
        delta = calc_overlapping_time(start1, end1, start2, end2)

        self.assertEqual(0, delta.total_seconds())

    def test_overlapping_time_total_overlap(self):
        start1 = datetime(2022, 1, 1, 10, 30)
        end1 = datetime(2022, 1, 1, 12, 30)
        start2 = datetime(2022, 1, 1, 10, 30)
        end2 = datetime(2022, 1, 1, 12, 30)
        delta = calc_overlapping_time(start1, end1, start2, end2)

        self.assertEqual(120, delta.total_seconds() / 60)

    def test_overlapping_time_contained(self):
        start1 = datetime(2022, 1, 1, 8, 30)
        end1 = datetime(2022, 1, 1, 13, 30)
        start2 = datetime(2022, 1, 1, 10, 30)
        end2 = datetime(2022, 1, 1, 12, 30)
        delta = calc_overlapping_time(start1, end1, start2, end2)

        self.assertEqual(120, delta.total_seconds() / 60)

    def test_overlapping_time_history1_first(self):
        start1 = datetime(2022, 1, 1, 10, 30)
        end1 = datetime(2022, 1, 1, 12, 30)
        start2 = datetime(2022, 1, 1, 11, 30)
        end2 = datetime(2022, 1, 1, 14, 30)
        delta = calc_overlapping_time(start1, end1, start2, end2)

        self.assertEqual(60, delta.total_seconds() / 60)

    def test_overlapping_time_history2_first(self):
        start1 = datetime(2022, 1, 1, 10, 30)
        end1 = datetime(2022, 1, 1, 12, 30)
        start2 = datetime(2022, 1, 1, 9, 30)
        end2 = datetime(2022, 1, 1, 11, 15)
        delta = calc_overlapping_time(start1, end1, start2, end2)

        self.assertEqual(45, delta.total_seconds() / 60)

    def test_overlapping_time_missing_end(self):
        start1 = datetime(2022, 1, 1, 10, 30)
        end1 = datetime(2022, 1, 1, 12, 30)
        start2 = datetime(2022, 1, 1, 13, 30)
        end2 = None
        delta = calc_overlapping_time(start1, end1, start2, end2)

        self.assertEqual(0, delta.total_seconds())

    def test_timedelta_to_str_no_seconds(self):
        delta = timedelta(hours=10, minutes=23, seconds=0)
        self.assertEqual("10 hrs 23 mins", timedelta_to_str(delta))

    def test_timedelta_to_str_nonzero_seconds(self):
        delta = timedelta(hours=10, minutes=23, seconds=19)
        self.assertEqual("10 hrs 23 mins", timedelta_to_str(delta))

    def test_timedelta_to_str_greater_than_24_hours(self):
        delta = timedelta(hours=127, minutes=23, seconds=19)
        self.assertEqual("127 hrs 23 mins", timedelta_to_str(delta))

    def test_timedelta_to_str_none(self):
        delta = None
        self.assertEqual("0 hrs 0 mins", timedelta_to_str(delta))

    def test_datetime_str_to_datetime_none(self):
        input_str = None
        self.assertIsNone(datetime_str_to_datetime(input_str))

    def test_datetime_str_to_datetime_empty(self):
        input_str = ""
        self.assertIsNone(datetime_str_to_datetime(input_str))

    def test_datetime_str_to_datetime_nonzero(self):
        input_str = "2022-12-22T07:12:15.23984"
        obj = datetime(year=2022, month=12, day=22, hour=7, minute=12, second=15)

        self.assertEqual(obj, datetime_str_to_datetime(input_str))

    def test_datetime_str_to_datetime_missing_milliseconds(self):
        input_str = "2022-12-22T07:12:15"
        obj = datetime(year=2022, month=12, day=22, hour=7, minute=12, second=15)

        self.assertEqual(obj, datetime_str_to_datetime(input_str))

    def test_datetime_str_to_datetime_greater_than_12_hour(self):
        input_str = "2022-12-22T15:12:15.23984"
        obj = datetime(year=2022, month=12, day=22, hour=15, minute=12, second=15)

        self.assertEqual(obj, datetime_str_to_datetime(input_str))

    def test_datetime_str_to_datetime_format_str(self):
        input_str = "12/22/2022T07:12:15.23984"
        format_str = "%m/%d/%Y %H:%M:%S"
        obj = datetime(year=2022, month=12, day=22, hour=7, minute=12, second=15)

        self.assertEqual(obj, datetime_str_to_datetime(input_str, format_str))

    def test_datetime_str_to_datetime_zero_padded(self):
        input_str = "2022-09-04T03:05:07.23984"
        obj = datetime(year=2022, month=9, day=4, hour=3, minute=5, second=7)

        self.assertEqual(obj, datetime_str_to_datetime(input_str))

    def test_datetime_str_to_datetime_non_zero_padded(self):
        input_str = "2022-9-4T3:5:7.23984"
        obj = datetime(year=2022, month=9, day=4, hour=3, minute=5, second=7)

        self.assertEqual(obj, datetime_str_to_datetime(input_str))

    def test_dict_to_rcal_empty(self):
        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        self.assertEqual({}, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_overall_zero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=0
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today() - timedelta(days=1),
            rating=0,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {}

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_single_rating_per_rater_per_ratee(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3.5,
            ("Joe Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater1,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3.5,
            ("Captain Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_ratee(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater2,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3.5,
            ("Joe Iosue", "Lacy Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3,
            ("Captain Iosue", "Lacy Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee_averaged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 4,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee_nonaveraged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): [3, 5],
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date, returnAveraged=False))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee_nonaveraged_ordered(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): [5, 3],
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date, returnAveraged=False))

    def test_dict_to_rcal_athleticism_empty(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {}

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_zero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=0,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {}

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_nonzero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=0.5,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            athleticism_rating=2,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 0.5,
            ("Joe Iosue", "Andrea Iosue", 0): 2,
        }

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_nonzero_averaged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=1,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
            athleticism_rating=2,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 1.5,
        }

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_nonzero_nonaveraged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=1,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
            athleticism_rating=2,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): [1, 2],
        }

        self.assertEqual(
            rcal_dict,
            dict_to_rcal(
                ratings, min_date, rating_name="athleticism", returnAveraged=False
            ),
        )

    def test_dict_to_rcal_decision_zero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {}

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="decision")
        )

    def test_dict_to_rcal_decision_nonzero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0.5,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            decision_rating=2,
        )

        ratings = Rating.objects.all()
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 0.5,
            ("Joe Iosue", "Andrea Iosue", 0): 2,
        }

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="decision")
        )

    def test_calibrate(self):
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0.5,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            decision_rating=2,
        )
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater2,
            date=date.today(),
            rating=4,
            decision_rating=2,
        )
        ratings = Rating.objects.all()

        cp = calibrate(ratings)
        self.assertIsInstance(cp, CalibrationParameters, f"Type: {type(cp)}")

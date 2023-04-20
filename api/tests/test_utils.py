from django.test import TestCase
from datetime import datetime, timedelta
from api.utils import *


class TestUtils(TestCase):
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

from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from api.utils.consts import format_weekday_month_day
from api.utils.ticket_emails import _format_deadline_long, _format_deadline_short


class PortableDateFormattingTests(SimpleTestCase):
    def test_weekday_month_day_omits_leading_zero(self):
        self.assertEqual(
            format_weekday_month_day(date(2026, 4, 9)),
            "Thu, Apr 9",
        )

    def test_ticket_deadlines_use_portable_unpadded_hour_format(self):
        deadline = datetime(2026, 8, 1, 18, 0, tzinfo=ZoneInfo("America/New_York"))
        self.assertEqual(_format_deadline_short(deadline), "6:00 PM ET")
        self.assertEqual(
            _format_deadline_long(deadline),
            "6:00 PM ET on Saturday, August 1",
        )

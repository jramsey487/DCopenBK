from datetime import datetime, timezone as datetime_timezone

from django.test import TestCase
from zoneinfo import ZoneInfo

from api.management.commands.send_notifications import Command, format_time
from api.models.schedule import Tournament


class NotificationTimezoneTests(TestCase):
    def test_schedule_time_is_displayed_in_eastern_time(self):
        # These UTC instants are the two occurrences of 1:30 AM on the
        # 2026 fall-back transition. Both should display as 1:30 AM locally.
        first = datetime(2026, 11, 1, 5, 30, tzinfo=datetime_timezone.utc)
        second = datetime(2026, 11, 1, 6, 30, tzinfo=datetime_timezone.utc)

        self.assertEqual(format_time(first), "1:30 AM")
        self.assertEqual(format_time(second), "1:30 AM")

    def test_active_tournament_uses_eastern_calendar_date(self):
        tournament = Tournament.objects.create(
            year=2026,
            start_date=datetime(2026, 11, 21).date(),
            end_date=datetime(2026, 11, 22).date(),
        )
        # 02:00 UTC on Nov 23 is 21:00 Eastern on Nov 22.
        now = datetime(2026, 11, 23, 2, 0, tzinfo=datetime_timezone.utc)

        self.assertEqual(Command().active_tournament(now), tournament)

    def test_active_tournament_uses_eastern_year_at_new_year_boundary(self):
        tournament = Tournament.objects.create(
            year=2026,
            start_date=datetime(2026, 12, 31).date(),
            end_date=datetime(2026, 12, 31).date(),
        )
        # 02:00 UTC on Jan 1 is still Dec 31 in America/New_York.
        now = datetime(2027, 1, 1, 2, 0, tzinfo=datetime_timezone.utc)

        self.assertEqual(Command().active_tournament(now), tournament)

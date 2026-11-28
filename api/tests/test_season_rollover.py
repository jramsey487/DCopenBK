from datetime import date

from django.test import TestCase

from api.models.schedule import Tournament
from api.views.season_rollover import _rollover_seasons


class SeasonRolloverSeasonSelectionTests(TestCase):
    def test_selects_upcoming_tournament_and_previous_actual_season(self):
        Tournament.objects.create(
            year=2026,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )
        upcoming = Tournament.objects.create(
            year=2027,
            start_date=date(2027, 7, 24),
            end_date=date(2027, 8, 1),
        )

        tournament, target_year, season_year = _rollover_seasons(
            today=date(2026, 11, 28)
        )

        self.assertEqual(tournament, upcoming)
        self.assertEqual(target_year, 2027)
        self.assertEqual(season_year, 2026)

    def test_advances_from_latest_completed_tournament_when_next_not_configured(self):
        latest = Tournament.objects.create(
            year=2026,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )

        tournament, target_year, season_year = _rollover_seasons(
            today=date(2026, 11, 28)
        )

        self.assertIsNone(tournament)
        self.assertEqual(target_year, 2027)
        self.assertEqual(season_year, latest.start_date.year)

    def test_uses_start_date_year_not_legacy_tournament_key(self):
        Tournament.objects.create(
            year=2026,
            start_date=date(2026, 7, 18),
            end_date=date(2026, 7, 26),
        )
        target = Tournament.objects.create(
            year=2026,
            start_date=date(2027, 7, 24),
            end_date=date(2027, 8, 1),
        )

        tournament, target_year, season_year = _rollover_seasons(
            today=date(2026, 11, 28)
        )

        self.assertEqual(tournament, target)
        self.assertEqual(target_year, 2027)
        self.assertEqual(season_year, 2026)

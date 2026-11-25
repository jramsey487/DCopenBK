from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from api.models.ballkid import Ballkid, TeamHistory
from api.utils.teams_generator import get_previous_teammates


class PreviousTeammateHistoryTests(TestCase):
    def make_ballkid(self, name):
        return Ballkid.objects.create(first_name=name, last_name="Test")

    def add_history(self, ballkid, team, start):
        return TeamHistory.objects.create(ballkid=ballkid, team=team, start=start)

    def test_fetches_history_in_constant_query_count_and_keeps_team_day_groups(self):
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        two_days_ago = now - timedelta(days=2)

        a = self.make_ballkid("A")
        b = self.make_ballkid("B")
        c = self.make_ballkid("C")
        d = self.make_ballkid("D")
        e = self.make_ballkid("E")

        # A/B share the latest team-day; C is on a different team that day.
        self.add_history(a, 1, yesterday)
        self.add_history(b, 1, yesterday + timedelta(minutes=1))
        self.add_history(c, 2, yesterday)
        self.add_history(d, 3, two_days_ago)
        self.add_history(e, 3, two_days_ago)

        # Older history must not replace a ballkid's latest team/day.
        self.add_history(a, 9, two_days_ago)
        self.add_history(b, 9, two_days_ago)

        with self.assertNumQueries(2):
            previous = get_previous_teammates([a.id, b.id, c.id, d.id, e.id])

        self.assertEqual(previous[a.id], {b.id})
        self.assertEqual(previous[b.id], {a.id})
        self.assertEqual(previous[c.id], set())
        self.assertEqual(previous[d.id], {e.id})
        self.assertEqual(previous[e.id], {d.id})

    def test_empty_input_returns_without_database_queries(self):
        with self.assertNumQueries(0):
            self.assertEqual(get_previous_teammates([]), {})
